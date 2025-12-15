'use client';

import { useMemo, useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { WorkItem } from '@/lib/types';
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
  PlusCircle,
} from 'lucide-react';
import { useTabs } from '@/contexts/tab-context';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { NewUserDialog } from './new-user-dialog';

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

export function AdminDashboard() {
  const { firestore } = useFirebase();
  const { openTab } = useTabs();
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);

  const workItemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // Admin query: gets all work items
    return query(collection(firestore, 'work_items'));
  }, [firestore]);

  const { data: workItems, isLoading } = useCollection<WorkItem>(workItemsQuery);

  const handleRowClick = (item: WorkItem) => {
    openTab({
      id: item.id,
      title: `WI-${item.id.slice(0, 4)}`,
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
    <>
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">All work items in the system.</p>
        </div>
        <Button onClick={() => setIsNewUserDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create User
        </Button>
      </div>
      <p className="mb-6 text-muted-foreground">All work items in the system.</p>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="w-[120px]">ID</TableHead>
              <TableHead className="w-[150px]">Status</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="w-[180px]">Assigned To</TableHead>
              <TableHead className="w-[180px]">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedWorkItems && sortedWorkItems.map((item) => (
              <TableRow key={item.id} onClick={() => handleRowClick(item)} className="cursor-pointer">
                <TableCell className="text-center">
                  <UrgencyIcon urgency={item.urgency} />
                </TableCell>
                <TableCell className="font-medium">{`WI-${item.id.slice(0, 4)}`}</TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
                <TableCell>{item.subject}</TableCell>
                <TableCell>{item.assignedTo.slice(0,8)}...</TableCell>
                <TableCell>{format(new Date(item.updatedAt), 'MMM d, yyyy')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
    <NewUserDialog open={isNewUserDialogOpen} onOpenChange={setIsNewUserDialogOpen} />
    </>
  );
}
