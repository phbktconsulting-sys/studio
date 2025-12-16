
'use client';

import { useMemo, useState } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  Trash2,
  MoreVertical,
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
  const { openTab, closeTab } = useTabs();
  const { toast } = useToast();
  
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const workItemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'work_items'));
  }, [firestore]);

  const { data: workItems, isLoading: workItemsLoading } = useCollection<WorkItem>(workItemsQuery);
  
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: users, isLoading: usersLoading } = useCollection<User>(usersQuery);

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

  const handleDelete = async () => {
    if (!selectedItem) return;
    setIsDeleting(true);
    try {
      const result = await deleteWorkItem({ id: selectedItem.id });
      if (result.success) {
        toast({
          title: 'Work Item Deleted',
          description: `Work item ${selectedItem.customId} has been successfully deleted.`,
        });
        closeTab(selectedItem.id);
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
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
    }
  };

  const sortedWorkItems = useMemo(() => {
    if (!workItems) return [];
    return [...workItems].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [workItems]);

  if (workItemsLoading || usersLoading) {
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
              <TableHead className="w-[180px] text-xs">Assigned To</TableHead>
              <TableHead className="w-[180px] text-xs">Date</TableHead>
              <TableHead className="w-[100px] text-right text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedWorkItems &&
              sortedWorkItems.map((item) => (
                <TableRow key={item.id} className="group">
                  <TableCell onClick={() => handleRowClick(item)} className="cursor-pointer text-center py-1 px-4">
                    <UrgencyIcon urgency={item.urgency} />
                  </TableCell>
                  <TableCell onClick={() => handleRowClick(item)} className="font-medium cursor-pointer py-1 px-4 text-xs">{item.customId}</TableCell>
                  <TableCell onClick={() => handleRowClick(item)} className="cursor-pointer py-1 px-4 text-xs">
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell onClick={() => handleRowClick(item)} className="cursor-pointer py-1 px-4 text-xs">{item.subject}</TableCell>
                  <TableCell onClick={() => handleRowClick(item)} className="cursor-pointer py-1 px-4 text-xs">{usersMap.get(item.assignedTo) || 'Unassigned'}</TableCell>
                  <TableCell onClick={() => handleRowClick(item)} className="cursor-pointer py-1 px-4 text-xs">{format(new Date(item.updatedAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-right py-1 px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">More actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => { setSelectedItem(item); setIsDeleteDialogOpen(true); }} className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      
       {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the work item{' '}
              <span className="font-bold">{selectedItem?.customId}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedItem(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
