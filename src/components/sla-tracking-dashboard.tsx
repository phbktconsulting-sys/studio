'use client';

import { useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { WorkItem, User } from '@/lib/types';
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
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { Button } from './ui/button';
import { ArrowLeft, Flag, X } from 'lucide-react';
import { useTabs } from '@/contexts/tab-context';
import { Separator } from './ui/separator';

interface SlaTrackingDashboardProps {
  onBack: () => void;
}

interface SlaInfo {
  slaMet: boolean;
  days: number;
}

// Assumes a same-day SLA.
// Met if closed_date is same as created_date.
// Missed if still open after created_date OR closed_date > created_date.
const calculateSla = (item: WorkItem): SlaInfo => {
  const createdAt = parseISO(item.createdAt);
  
  if (item.status === 'Closed' || item.status === 'Re-indexed' || item.status === 'Terminated') {
    const updatedAt = parseISO(item.updatedAt);
    const days = differenceInCalendarDays(updatedAt, createdAt);
    return { slaMet: days <= 0, days };
  } else {
    // Still open
    const days = differenceInCalendarDays(new Date(), createdAt);
    return { slaMet: false, days };
  }
};

export function SlaTrackingDashboard({ onBack }: SlaTrackingDashboardProps) {
  const { firestore } = useFirebase();
  const { openTab } = useTabs();
  const [dateFilter, setDateFilter] = useState<Date | undefined>();

  const workItemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'work_items'));
  }, [firestore]);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: workItems, isLoading: workItemsLoading } = useCollection<WorkItem>(workItemsQuery);
  const { data: users, isLoading: usersLoading } = useCollection<User>(usersQuery);

  const isLoading = workItemsLoading || usersLoading;

  const usersMap = useMemo(() => {
    if (!users) return new Map<string, string>();
    return new Map(users.map(u => [u.uid, u.displayName || u.email || 'Unknown User']));
  }, [users]);
  
  const filteredWorkItems = useMemo(() => {
    if (!workItems) return [];
    if (!dateFilter) return workItems;
    return workItems.filter(item => {
        const itemDate = parseISO(item.createdAt);
        return format(itemDate, 'yyyy-MM-dd') === format(dateFilter, 'yyyy-MM-dd');
    })
  }, [workItems, dateFilter]);

  const slaData = useMemo(() => {
    if (!filteredWorkItems) return [];
    return filteredWorkItems.map(item => ({
      ...item,
      sla: calculateSla(item),
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filteredWorkItems]);
  
  const userSlaStats = useMemo(() => {
    const stats: { [key: string]: { met: number, missed: number, name: string } } = {};
    slaData.forEach(item => {
        if (!stats[item.assignedTo]) {
            stats[item.assignedTo] = { met: 0, missed: 0, name: usersMap.get(item.assignedTo) || 'Unassigned' };
        }
        if (item.sla.slaMet) {
            stats[item.assignedTo].met++;
        } else {
            stats[item.assignedTo].missed++;
        }
    });
    return Object.values(stats).sort((a, b) => b.missed - a.missed);
  }, [slaData, usersMap]);

  const processSlaStats = useMemo(() => {
    const stats: { [key: string]: { met: number, missed: number } } = {};
    slaData.forEach(item => {
        if (!stats[item.process]) {
            stats[item.process] = { met: 0, missed: 0 };
        }
        if (item.sla.slaMet) {
            stats[item.process].met++;
        } else {
            stats[item.process].missed++;
        }
    });
    return Object.entries(stats).map(([process, data]) => ({ process, ...data }));
  }, [slaData]);


  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
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
      </div>
      
      <div className="grid gap-6 lg:grid-cols-3">
        {/* User and Process Stats - Left/Right Columns */}
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader className='pb-2'>
                    <div className='flex justify-between items-center'>
                      <CardTitle className="text-base">SLA by User</CardTitle>
                      <div className='flex items-center gap-2'>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="h-7 w-auto justify-start text-left font-normal text-xs px-2">
                                    {dateFilter ? format(dateFilter, 'PPP') : <span>Date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar mode="single" selected={dateFilter} onSelect={setDateFilter} initialFocus />
                            </PopoverContent>
                        </Popover>
                         <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDateFilter(undefined)}>
                            <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription className='text-xs'>SLA met vs. missed counts for each user.</CardDescription>
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
                     <CardDescription className='text-xs'>SLA met vs. missed counts for each process type.</CardDescription>
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
                <CardTitle className="text-base">Overall Case SLA Status</CardTitle>
                 <CardDescription className='text-xs'>SLA status for all work items. Green means handled same-day, Red means overdue.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className='w-12 text-xs'>SLA</TableHead>
                            <TableHead className="text-xs">Case ID</TableHead>
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
                                <TableCell className="text-xs py-1">{usersMap.get(item.assignedTo)}</TableCell>
                                <TableCell className="text-xs py-1">{item.status}</TableCell>
                                <TableCell className="text-xs py-1">{format(parseISO(item.createdAt), 'MMM d, yyyy')}</TableCell>
                                <TableCell className="text-right text-xs py-1">{item.sla.days}</TableCell>
                            </TableRow>
                        ))}
                        {slaData.length === 0 && (
                             <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-4 text-xs">
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
  );
}
