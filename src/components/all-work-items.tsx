
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
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
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronUp,
} from 'lucide-react';
import { useTabs } from '@/contexts/tab-context';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

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

interface AllWorkItemsProps {
  onBack: () => void;
}

export function AllWorkItems({ onBack }: AllWorkItemsProps) {
  const { firestore } = useFirebase();
  const { openTab } = useTabs();

  const workItemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'work_items'));
  }, [firestore]);

  const { data: workItems, isLoading: workItemsLoading } = useCollection<WorkItem>(workItemsQuery);
  
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: usersData, isLoading: usersLoading } = useCollection<User>(usersQuery);

  const usersMap = useMemo(() => {
    if (!usersData) return new Map();
    return new Map(usersData.map(u => [u.uid, u.displayName]));
  }, [usersData]);

  const handleRowClick = (item: WorkItem) => {
    openTab({
      id: item.id,
      title: item.customId,
      type: 'work-item',
    });
  };

  const sortedWorkItems = useMemo(() => {
    if (!workItems) return [];
    return [...workItems].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [workItems]);

  const isLoading = workItemsLoading || usersLoading;

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
        <div className='flex items-center gap-4'>
           <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <div>
            <h1 className="font-headline text-lg font-bold tracking-tight">All Work Items</h1>
            <p className="text-xs text-muted-foreground">A view of all work items in the system.</p>
          </div>
        </div>
      </div>
      <div className="mt-6 rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="w-[120px] text-xs">ID</TableHead>
              <TableHead className="w-[150px] text-xs">Status</TableHead>
              <TableHead className='text-xs'>Subject</TableHead>
              <TableHead className="w-[180px] text-xs">Customer Name</TableHead>
              <TableHead className="w-[180px] text-xs">Assigned To</TableHead>
              <TableHead className="w-[180px] text-xs">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedWorkItems &&
              sortedWorkItems.map((item) => (
                <TableRow key={item.id} className="cursor-pointer group" onClick={() => handleRowClick(item)}>
                  <TableCell className="text-center py-1 px-4">
                    <UrgencyIcon urgency={item.urgency} />
                  </TableCell>
                  <TableCell className="font-medium py-1 px-4 text-xs">{item.customId}</TableCell>
                  <TableCell className="py-1 px-4 text-xs">
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="py-1 px-4 text-xs">{item.subject}</TableCell>
                  <TableCell className="py-1 px-4 text-xs">{item.relatedContact.name}</TableCell>
                  <TableCell className="py-1 px-4 text-xs">{usersMap.get(item.assignedTo) || 'Unassigned'}</TableCell>
                  <TableCell className="py-1 px-4 text-xs">{format(new Date(item.updatedAt), 'MMM d, yyyy')}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
