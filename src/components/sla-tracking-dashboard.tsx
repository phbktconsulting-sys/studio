'use client';

import { useMemo, useState } from 'react';
import { collection, query, where, collectionGroup } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { WorkItem, User, Note } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { differenceInCalendarDays, format, parseISO, isSameDay, subDays, startOfDay, endOfDay } from 'date-fns';
import { Button } from './ui/button';
import { ArrowLeft, Download, Flag, X, Calendar as CalendarIcon } from 'lucide-react';
import { useTabs } from '@/contexts/tab-context';
import { SlaReportDialog } from './sla-report-dialog';
import { DateRange } from 'react-date-range';

interface SlaTrackingDashboardProps {
  onBack: () => void;
}

export interface SlaInfo {
  slaMet: boolean;
  days: number;
}

const processTypes = [
  "New Business Request",
  "Development Services (Web & App)",
  "Operations & Support (Backend)",
  "Digital Services Request",
  "Feedback / Complaint",
  "Other Service Request",
  "Request Information",
  "Request Quotation",
  "Request Application",
  "Request Website",
  "Request inquiry",
  "Request Backend Support",
  "Request Other"
];


// SLA Logic:
// Met if closed_date is same as created_date/reallocation_date.
// Missed if not actioned (still 'Open') on the day after creation/reallocation.
export const calculateSla = (item: WorkItem, notes: Note[] | undefined): SlaInfo => {
    const reallocationNotes = (notes || [])
      .filter(note => note.category === 'Reallocation' && note.workItemId === item.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const slaStartDate = reallocationNotes.length > 0 ? parseISO(reallocationNotes[0].createdAt) : parseISO(item.createdAt);
    const now = new Date();

    if (item.status === 'Closed' || item.status === 'Re-indexed') {
        const updatedAt = parseISO(item.updatedAt);
        const days = differenceInCalendarDays(updatedAt, slaStartDate);
        // If it was closed, it met the SLA if closed on the same day it started (created or reallocated).
        return { slaMet: days <= 0, days };
    }
    
    // If it's still open, check how many days have passed since it started.
    const daysOpen = differenceInCalendarDays(now, slaStartDate);
    // It's a day after creation/reallocation and still open, so SLA is missed.
    if (daysOpen > 0) {
        return { slaMet: false, days: daysOpen };
    }
    
    // It's still the same day it was created/reallocated, so SLA is met for now.
    return { slaMet: true, days: 0 };
};


export function SlaTrackingDashboard({ onBack }: SlaTrackingDashboardProps) {
  const { firestore } = useFirebase();
  const { openTab } = useTabs();
  
  // States for filters
  const [userFilter, setUserFilter] = useState('all');
  const [processFilter, setProcessFilter] = useState('all');
  const [dateRange, setDateRange] = useState([
    {
      startDate: subDays(new Date(), 30),
      endDate: new Date(),
      key: 'selection'
    }
  ]);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  const workItemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'work_items'));
  }, [firestore]);
  
  const allNotesQuery = useMemoFirebase(() => {
    if(!firestore) return null;
    return query(collectionGroup(firestore, 'notes'));
  }, [firestore])
  
  const { data: allNotes, isLoading: notesLoading } = useCollection<Note>(allNotesQuery)


  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: workItems, isLoading: workItemsLoading } = useCollection<WorkItem>(workItemsQuery);
  const { data: users, isLoading: usersLoading } = useCollection<User>(usersQuery);

  const isLoading = workItemsLoading || usersLoading || notesLoading;

  const usersMap = useMemo(() => {
    if (!users) return new Map<string, string>();
    return new Map(users.map(u => [u.uid, u.displayName || u.email || 'Unknown User']));
  }, [users]);
  
  const dateFilteredWorkItems = useMemo(() => {
    if (!workItems) return [];
    const startDate = startOfDay(dateRange[0].startDate);
    const endDate = endOfDay(dateRange[0].endDate);
    return workItems.filter(item => {
        const createdAt = parseISO(item.createdAt);
        return createdAt >= startDate && createdAt <= endDate;
    });
  }, [workItems, dateRange]);


  const filteredWorkItems = useMemo(() => {
    if (!dateFilteredWorkItems) return [];
    
    return dateFilteredWorkItems.filter(item => {
        const userMatch = userFilter === 'all' || item.assignedTo === userFilter;
        const processMatch = processFilter === 'all' || item.process === processFilter;
        return userMatch && processMatch;
    });
  }, [dateFilteredWorkItems, userFilter, processFilter]);

  const slaData = useMemo(() => {
    if (!filteredWorkItems) return [];
    return filteredWorkItems.map(item => ({
      ...item,
      sla: calculateSla(item, allNotes),
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filteredWorkItems, allNotes]);
  
  const userSlaStats = useMemo(() => {
    const stats: { [key: string]: { met: number, missed: number, name: string } } = {};
    (dateFilteredWorkItems || []).forEach(item => {
        const sla = calculateSla(item, allNotes);
        const userKey = item.assignedTo;
        if (!stats[userKey]) {
            stats[userKey] = { met: 0, missed: 0, name: usersMap.get(userKey) || item.assignedTo };
        }
        if (sla.slaMet) {
            stats[userKey].met++;
        } else {
            stats[userKey].missed++;
        }
    });
    return Object.values(stats).sort((a, b) => b.missed - a.missed);
  }, [dateFilteredWorkItems, usersMap, allNotes]);

  const processSlaStats = useMemo(() => {
    const stats: { [key: string]: { met: number, missed: number } } = {};
    (dateFilteredWorkItems || []).forEach(item => {
        const sla = calculateSla(item, allNotes);
        const processKey = item.process;
        if (!stats[processKey]) {
            stats[processKey] = { met: 0, missed: 0 };
        }
        if (sla.slaMet) {
            stats[processKey].met++;
        } else {
            stats[processKey].missed++;
        }
    });
    return Object.entries(stats).map(([process, data]) => ({ process, ...data }));
  }, [dateFilteredWorkItems, allNotes]);

  const clearFilters = () => {
    setUserFilter('all');
    setProcessFilter('all');
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
            <div>
              <h1 className="font-headline text-lg font-bold tracking-tight">SLA Tracking Dashboard</h1>
              <p className="text-xs text-muted-foreground">Monitor case handling times and SLA compliance.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant="outline"
                  className="h-8 w-[240px] justify-start text-left font-normal text-xs"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange[0].startDate && dateRange[0].endDate ? (
                    <>
                      {format(dateRange[0].startDate, "LLL dd, y")} -{" "}
                      {format(dateRange[0].endDate, "LLL dd, y")}
                    </>
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                 <DateRange
                    editableDateInputs={true}
                    onChange={item => setDateRange([item.selection])}
                    moveRangeOnFirstSelection={false}
                    ranges={dateRange}
                    className="w-full"
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" className='h-8 text-xs' onClick={() => setIsReportDialogOpen(true)}>
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>
          </div>
        </div>
        
        <div className="grid gap-6 lg:grid-cols-3">
          {/* User and Process Stats - Left/Right Columns */}
          <div className="lg:col-span-1 space-y-6">
              <Card>
                  <CardHeader className='pb-2'>
                      <div className='flex justify-between items-center'>
                        <CardTitle className="text-base">SLA by User</CardTitle>
                      </div>
                      <CardDescription className='text-xs'>SLA met vs. missed for the selected date range.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead className="text-xs">User</TableHead>
                                  <TableHead className="text-center text-xs text-green-600">Met</TableHead>
                                  <TableHead className="text-center text-xs text-red-600">Missed</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {userSlaStats.map(stat => (
                                  <TableRow key={stat.name}>
                                      <TableCell className="text-xs font-medium py-1">{stat.name}</TableCell>
                                      <TableCell className="text-center text-xs py-1">{stat.met}</TableCell>
                                      <TableCell className="text-center text-xs py-1">{stat.missed}</TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </CardContent>
              </Card>

              <Card>
                  <CardHeader>
                      <CardTitle className="text-base">SLA by Process</CardTitle>
                       <CardDescription className='text-xs'>SLA met vs. missed for the selected date range.</CardDescription>
                  </CardHeader>
                  <CardContent>
                       <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead className="text-xs">Process</TableHead>
                                  <TableHead className="text-center text-xs text-green-600">Met</TableHead>
                                  <TableHead className="text-center text-xs text-red-600">Missed</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {processSlaStats.map(stat => (
                                  <TableRow key={stat.process}>
                                      <TableCell className="text-xs font-medium py-1">{stat.process}</TableCell>
                                      <TableCell className="text-center text-xs py-1">{stat.met}</TableCell>
                                      <TableCell className="text-center text-xs py-1">{stat.missed}</TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </CardContent>
              </Card>
          </div>
          
          {/* All Cases Table - Takes 2/3 width on large screens */}
          <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">Overall Case SLA Status</CardTitle>
                      <CardDescription className='text-xs'>SLA status for items in date range. Green=handled same-day, Red=overdue.</CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                      <Select value={userFilter} onValueChange={setUserFilter}>
                          <SelectTrigger className="h-8 w-full flex-1 min-w-[150px] text-xs">
                              <SelectValue placeholder="Filter by User" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all" className="text-xs">All Users</SelectItem>
                              {users?.map(user => <SelectItem key={user.uid} value={user.uid} className="text-xs">{user.displayName}</SelectItem>)}
                          </SelectContent>
                      </Select>
                      <Select value={processFilter} onValueChange={setProcessFilter}>
                          <SelectTrigger className="h-8 w-full flex-1 min-w-[150px] text-xs">
                              <SelectValue placeholder="Filter by Process" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all" className="text-xs">All Processes</SelectItem>
                              {processTypes.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                          </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearFilters}>
                          <X className="h-4 w-4" />
                          <span className="sr-only">Clear filters</span>
                      </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead className='w-12 text-xs'>SLA</TableHead>
                              <TableHead className="text-xs">Case ID</TableHead>
                              <TableHead className="text-xs">Process</TableHead>
                              <TableHead className="text-xs">Assigned To</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                               <TableHead className="text-xs">Created</TableHead>
                              <TableHead className="text-right text-xs">Days</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {slaData.map(item => (
                              <TableRow key={item.id} className="cursor-pointer" onClick={() => openTab({ id: item.id, title: item.customId, type: 'work-item'})}>
                                  <TableCell className="py-1">
                                      <Flag className={`h-4 w-4 ${item.sla.slaMet ? 'text-green-500' : 'text-red-500'}`} />
                                  </TableCell>
                                  <TableCell className="text-xs font-medium py-1">{item.customId}</TableCell>
                                  <TableCell className="text-xs py-1">{item.process}</TableCell>
                                  <TableCell className="text-xs py-1">{usersMap.get(item.assignedTo) || item.assignedTo}</TableCell>
                                  <TableCell className="text-xs py-1">{item.status}</TableCell>
                                  <TableCell className="text-xs py-1">{format(parseISO(item.createdAt), 'MMM d, yyyy')}</TableCell>
                                  <TableCell className="text-right text-xs py-1">{item.sla.days}</TableCell>
                              </TableRow>
                          ))}
                          {slaData.length === 0 && (
                               <TableRow>
                                  <TableCell colSpan={7} className="text-center text-muted-foreground py-4 text-xs">
                                  No work items found for the selected criteria.
                                  </TableCell>
                              </TableRow>
                          )}
                      </TableBody>
                  </Table>
                </CardContent>
              </Card>
          </div>
        </div>
      </div>
       <SlaReportDialog
        isOpen={isReportDialogOpen}
        onClose={() => setIsReportDialogOpen(false)}
        workItems={workItems || []}
        usersMap={usersMap}
      />
    </>
  );
}
