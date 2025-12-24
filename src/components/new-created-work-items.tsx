
'use client';

import { useMemo } from 'react';
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
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTabs } from '@/contexts/tab-context';
import { format, startOfDay, endOfDay } from 'date-fns';

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

interface NewCreatedWorkItemsProps {
  onBack: () => void;
}

export function NewCreatedWorkItems({ onBack }: NewCreatedWorkItemsProps) {
  const { firestore } = useFirebase();
  const { openTab } = useTabs();

  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();

  const workItemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'work_items'),
      where('createdAt', '>=', todayStart),
      where('createdAt', '<=', todayEnd),
      where('status', '==', 'Open')
    );
  }, [firestore, todayStart, todayEnd]);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: workItems, isLoading: workItemsLoading } = useCollection<WorkItem>(workItemsQuery);
  const { data: users, isLoading: usersLoading } = useCollection<User>(usersQuery);

  const usersMap = useMemo(() => {
    if (!users) return new Map();
    return new Map(users.map((u) => [u.uid, u.displayName]));
  }, [users]);

  const handleRowClick = (item: WorkItem) => {
    openTab({
      id: item.id,
      title: item.customId,
      type: 'work-item',
    });
  };
  
  const sortedItems = useMemo(() => {
    if (!workItems) return [];

    const unassignedItems = workItems.filter(item => {
        // Heuristic: User UIDs are long (28 chars), process names are shorter.
        // This filters for items assigned to a process queue.
        return item.assignedTo.length < 28;
    });

    return unassignedItems.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];
  }, [workItems]);

  const isLoading = workItemsLoading || usersLoading;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <div>
            <h1 className="font-headline text-lg font-bold tracking-tight">New Unassigned Work Items</h1>
            <p className="text-xs text-muted-foreground">
              Showing open, unassigned work items created today, {format(new Date(), 'PPP')}.
            </p>
          </div>
        </div>
      </div>
      <div className="mt-6 rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px] text-xs">Case ID</TableHead>
              <TableHead className="text-xs">Subject</TableHead>
              <TableHead className="w-[150px] text-xs">Process</TableHead>
              <TableHead className="w-[150px] text-xs">Status</TableHead>
              <TableHead className="w-[180px] text-xs">Created By</TableHead>
              <TableHead className="w-[180px] text-xs">Assigned To Queue</TableHead>
              <TableHead className="w-[180px] text-xs">Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-4 text-xs">
                  Loading work items...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && sortedItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-4 text-xs">
                  No open, unassigned work items have been created today.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              sortedItems.map((item) => (
                <TableRow key={item.id} onClick={() => handleRowClick(item)} className="cursor-pointer">
                  <TableCell className="font-mono text-xs py-1 px-4">{item.customId}</TableCell>
                  <TableCell className="font-medium text-xs py-1 px-4">{item.subject}</TableCell>
                  <TableCell className="text-xs py-1 px-4">{item.process}</TableCell>
                  <TableCell className="text-xs py-1 px-4">
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-xs py-1 px-4">{usersMap.get(item.createdBy) || item.createdBy}</TableCell>
                  <TableCell className="text-xs py-1 px-4">{item.assignedTo}</TableCell>
                  <TableCell className="text-xs py-1 px-4">{format(new Date(item.createdAt), 'p')}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
