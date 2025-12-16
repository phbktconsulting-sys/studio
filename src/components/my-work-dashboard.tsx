
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
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ChevronUp,
} from 'lucide-react';
import { useTabs } from '@/contexts/tab-context';
import { format } from 'date-fns';

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
    : 'bg-gray-500 hover:bg-gray-600'

  return <Badge variant="default" className={`border-transparent text-primary-foreground ${colorClass}`}>{status}</Badge>;
};

export function MyWorkDashboard() {
  const { firestore, user } = useFirebase();
  const { openTab } = useTabs();

  const workItemsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'work_items'),
      where('assignedTo', '==', user.uid)
    );
  }, [firestore, user]);

  const { data: workItems, isLoading } = useCollection<WorkItem>(workItemsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: users } = useCollection<User>(usersQuery);

  const usersMap = useMemo(() => {
    if (!users) return new Map();
    return new Map(users.map(u => [u.uid, u.displayName]));
  }, [users]);


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
          <h1 className="font-headline text-lg font-bold tracking-tight text-xs">My Work</h1>
          <p className="text-xs text-muted-foreground">Work items assigned to you.</p>
        </div>
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
            {sortedWorkItems && sortedWorkItems.map((item) => (
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
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
