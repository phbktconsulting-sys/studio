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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import { useTabs } from '@/contexts/tab-context';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { deleteWorkItem } from '@/ai/flows/delete-work-item-flow';

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
  const { openTab, closeTab } = useTabs();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const workItemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'work_items'));
  }, [firestore]);

  const { data: workItems, isLoading } = useCollection<WorkItem>(workItemsQuery);

  const handleRowClick = (item: WorkItem) => {
    openTab({
      id: item.id,
      title: item.customId,
      type: 'work-item',
    });
  };

  const handleDelete = async (item: WorkItem) => {
    setIsDeleting(true);
    try {
      const result = await deleteWorkItem({ id: item.id });
      if (result.success) {
        toast({
          title: 'Work Item Deleted',
          description: `Work item ${item.customId} has been successfully deleted.`,
        });
        closeTab(item.id); // Close the tab if it's open
      } else {
        throw new Error(result.error || 'An unknown error occurred.');
      }
    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'Error Deleting Work Item',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsDeleting(false);
    }
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
        <div className='flex items-center gap-4'>
           <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <div>
            <h1 className="font-headline text-2xl font-bold tracking-tight">All Work Items</h1>
            <p className="text-muted-foreground">A view of all work items in the system.</p>
          </div>
        </div>
      </div>
      <div className="mt-6 rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="w-[120px]">ID</TableHead>
              <TableHead className="w-[150px]">Status</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="w-[180px]">Assigned To</TableHead>
              <TableHead className="w-[180px]">Date</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedWorkItems &&
              sortedWorkItems.map((item) => (
                <TableRow key={item.id} className="group">
                  <TableCell onClick={() => handleRowClick(item)} className="cursor-pointer text-center">
                    <UrgencyIcon urgency={item.urgency} />
                  </TableCell>
                  <TableCell onClick={() => handleRowClick(item)} className="font-medium cursor-pointer">{item.customId}</TableCell>
                  <TableCell onClick={() => handleRowClick(item)} className="cursor-pointer">
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell onClick={() => handleRowClick(item)} className="cursor-pointer">{item.subject}</TableCell>
                  <TableCell onClick={() => handleRowClick(item)} className="cursor-pointer">{item.assignedTo.slice(0, 8)}...</TableCell>
                  <TableCell onClick={() => handleRowClick(item)} className="cursor-pointer">{format(new Date(item.updatedAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                           <Trash2 className="h-4 w-4" />
                         </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the work item
                             <span className="font-bold"> {item.customId}</span>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(item)}
                            disabled={isDeleting}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
