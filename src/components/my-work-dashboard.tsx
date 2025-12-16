
'use client';

import { useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { WorkItem, User } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ArrowDown, ArrowRight, ChevronUp, X } from 'lucide-react';
import { useTabs } from '@/contexts/tab-context';
import { format, isSameDay, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';

const UrgencyIcon = ({ urgency }: { urgency: WorkItem['urgency'] }) => {
  switch (urgency) {
    case 'High':
      return <ChevronUp className="h-5 w-5 text-red-500" />;
    case 'Medium':
      return <ArrowRight className="h-5 w-5 text-yellow-500" />;
    case 'Low':
      return <ArrowDown className="h-5 w-5 text-green-500" />;
    default:
      return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
  }
};

const StatusBadge = ({ status }: { status: WorkItem['status'] }) => {
  const colorClass =
    status === 'Open'
      ? 'bg-blue-500 hover:bg-blue-600'
      : status === 'In Progress'
      ? 'bg-yellow-500 hover:bg-yellow-600'
      : status === 'Pending'
      ? 'bg-orange-500 hover:bg-orange-600'
      : status === 'Re-indexed'
      ? 'bg-purple-500 hover:bg-purple-600'
      : 'bg-gray-500 hover:bg-gray-600';

  return (
    <Badge variant="default" className={`border-transparent text-primary-foreground ${colorClass}`}>
      {status}
    </Badge>
  );
};

const processTypes = [
  'Request Information',
  'Request Quotation',
  'Request Application',
  'Request Website',
  'Request inquiry',
  'Request Backend Support',
  'Request Other',
];
const statusTypes: WorkItem['status'][] = ['Open', 'In Progress', 'Pending', 'Closed', 'Re-indexed'];

export function MyWorkDashboard() {
  const { firestore, user } = useFirebase();
  const { openTab } = useTabs();
  
  const [statusFilter, setStatusFilter] = useState<string>('Open');
  const [processFilter, setProcessFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>();

  // Query for items assigned to the user
  const assignedItemsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'work_items'), where('assignedTo', '==', user.uid));
  }, [firestore, user]);

  // Query for items created by the user
  const createdItemsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'work_items'), where('createdBy', '==', user.uid));
  }, [firestore, user]);

  const { data: assignedItems, isLoading: assignedLoading } = useCollection<WorkItem>(assignedItemsQuery);
  const { data: createdItems, isLoading: createdLoading } = useCollection<WorkItem>(createdItemsQuery);

  const workItems = useMemo(() => {
    const allItems = new Map<string, WorkItem>();
    if (assignedItems) {
      assignedItems.forEach((item) => allItems.set(item.id, item));
    }
    if (createdItems) {
      createdItems.forEach((item) => allItems.set(item.id, item));
    }
    return Array.from(allItems.values());
  }, [assignedItems, createdItems]);

  const handleRowClick = (item: WorkItem) => {
    openTab({
      id: item.id,
      title: item.customId,
      type: 'work-item',
    });
  };

  const filteredAndSortedWorkItems = useMemo(() => {
    let filtered = workItems;

    if (statusFilter) {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }
    if (processFilter) {
      filtered = filtered.filter((item) => item.process === processFilter);
    }
    if (dateFilter) {
      filtered = filtered.filter((item) => isSameDay(parseISO(item.createdAt), dateFilter));
    }

    return filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [workItems, statusFilter, processFilter, dateFilter]);

  const isLoading = assignedLoading || createdLoading;
  
  const clearFilters = () => {
    setStatusFilter('Open');
    setProcessFilter('');
    setDateFilter(undefined);
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-lg font-bold tracking-tight">My Work</h1>
          <p className="text-xs text-muted-foreground">Work items assigned to or created by you.</p>
        </div>
      </div>

       <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-full flex-1 min-w-[150px] text-xs">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
             <SelectItem value="">All Statuses</SelectItem>
             {statusTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={processFilter} onValueChange={setProcessFilter}>
          <SelectTrigger className="h-8 w-full flex-1 min-w-[150px] text-xs">
            <SelectValue placeholder="Filter by Process" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Processes</SelectItem>
            {processTypes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-8 w-full flex-1 min-w-[150px] justify-start text-left font-normal text-xs">
              {dateFilter ? format(dateFilter, 'PPP') : <span>Filter by Date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFilter} onSelect={setDateFilter} initialFocus />
          </PopoverContent>
        </Popover>
        
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearFilters}>
            <X className="h-4 w-4" />
            <span className="sr-only">Clear filters</span>
        </Button>
      </div>

      <div className="mt-6 rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="w-[120px] text-xs">Case ID</TableHead>
              <TableHead className="w-[150px] text-xs">Status</TableHead>
              <TableHead className="text-xs">Subject</TableHead>
              <TableHead className="w-[180px] text-xs">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedWorkItems &&
              filteredAndSortedWorkItems.map((item) => (
                <TableRow key={item.id} onClick={() => handleRowClick(item)} className="cursor-pointer">
                  <TableCell className="text-center py-1 px-4">
                    <UrgencyIcon urgency={item.urgency} />
                  </TableCell>
                  <TableCell className="font-medium py-1 px-4 text-xs">{item.customId}</TableCell>
                  <TableCell className="py-1 px-4 text-xs">
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="py-1 px-4 text-xs">{item.subject}</TableCell>
                  <TableCell className="py-1 px-4 text-xs">{format(new Date(item.updatedAt), 'MMM d, yyyy')}</TableCell>
                </TableRow>
              ))}
            {(!filteredAndSortedWorkItems || filteredAndSortedWorkItems.length === 0) && !isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-4 text-xs">
                  No work items match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
