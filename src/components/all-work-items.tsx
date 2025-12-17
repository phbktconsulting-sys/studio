'use client';

import { useMemo, useState } from 'react';
import { collection, doc, query, updateDoc, addDoc } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { WorkItem, User, Task } from '@/lib/types';
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
  MoreHorizontal,
} from 'lucide-react';
import { useTabs } from '@/contexts/tab-context';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteWorkItem } from '@/ai/flows/delete-work-item-flow';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

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
  const { firestore, user: currentUser } = useFirebase();
  const { openTab } = useTabs();
  const { toast } = useToast();

  const [itemToDelete, setItemToDelete] = useState<WorkItem | null>(null);
  const [itemToReallocate, setItemToReallocate] = useState<WorkItem | null>(null);
  const [reallocateTo, setReallocateTo] = useState('');
  const [reallocateTask, setReallocateTask] = useState('');
  const [reallocateNote, setReallocateNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);


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

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const result = await deleteWorkItem({ id: itemToDelete.id });
    if (result.success) {
      toast({
        title: 'Work Item Deleted',
        description: `Work item "${itemToDelete.customId}" has been permanently deleted.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Error Deleting Item',
        description: result.error || 'An unexpected error occurred.',
      });
    }
    setItemToDelete(null);
  };
  
  const handleConfirmReallocate = async () => {
    if (!itemToReallocate || !reallocateTo || !currentUser || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select a user to reallocate to.' });
        return;
    }
    setIsSubmitting(true);

    try {
        const workItemRef = doc(firestore, 'work_items', itemToReallocate.id);
        const notesCollectionRef = collection(firestore, `work_items/${itemToReallocate.id}/notes`);

        const newTasks: Task[] = [...(itemToReallocate.tasks || [])];
        if (reallocateTask) {
            newTasks.push({ id: `task-${Date.now()}`, text: reallocateTask, completed: false });
        }
        
        await updateDoc(workItemRef, {
            assignedTo: reallocateTo,
            updatedAt: new Date().toISOString(),
            tasks: newTasks
        });

        const newNote = {
            authorId: currentUser.uid,
            text: `Work item reallocated from ${usersMap.get(itemToReallocate.assignedTo)} to ${usersMap.get(reallocateTo)}. Note: ${reallocateNote}`,
            createdAt: new Date().toISOString(),
            workItemId: itemToReallocate.id,
            category: 'Reallocation',
            subject: 'Work Item Reallocated'
        };
        await addDoc(notesCollectionRef, newNote);

        toast({
            title: 'Work Item Reallocated',
            description: `Work item "${itemToReallocate.customId}" has been reallocated.`,
        });

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Reallocation Failed',
            description: error.message || 'An unexpected error occurred.',
        });
    } finally {
        setItemToReallocate(null);
        setReallocateTo('');
        setReallocateTask('');
        setReallocateNote('');
        setIsSubmitting(false);
    }
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
    <>
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
              <TableHead className="w-[80px] text-center text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedWorkItems &&
              sortedWorkItems.map((item) => (
                <TableRow key={item.id} className="cursor-pointer group">
                  <TableCell onClick={() => handleRowClick(item)} className="text-center py-1 px-4">
                    <UrgencyIcon urgency={item.urgency} />
                  </TableCell>
                  <TableCell onClick={() => handleRowClick(item)} className="font-medium py-1 px-4 text-xs">{item.customId}</TableCell>
                  <TableCell onClick={() => handleRowClick(item)} className="py-1 px-4 text-xs">
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell onClick={() => handleRowClick(item)} className="py-1 px-4 text-xs">{item.subject}</TableCell>
                  <TableCell onClick={() => handleRowClick(item)} className="py-1 px-4 text-xs">{item.relatedContact.name}</TableCell>
                  <TableCell onClick={() => handleRowClick(item)} className="py-1 px-4 text-xs">{usersMap.get(item.assignedTo) || 'Unassigned'}</TableCell>
                  <TableCell onClick={() => handleRowClick(item)} className="py-1 px-4 text-xs">{format(new Date(item.updatedAt), 'MMM d, yyyy')}</TableCell>
                   <TableCell className="py-1 px-4 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setItemToReallocate(item)}>
                          Reallocate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => setItemToDelete(item)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
    
     {/* Delete Confirmation Dialog */}
    <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the work item "{itemToDelete?.customId}" and all of its associated data.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
                Delete
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    
    {/* Reallocate Dialog */}
    <Dialog open={!!itemToReallocate} onOpenChange={(open) => !open && setItemToReallocate(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reallocate Work Item: {itemToReallocate?.customId}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reallocate-user" className="text-right text-xs">Reallocate To</Label>
                    <Select onValueChange={setReallocateTo} value={reallocateTo}>
                        <SelectTrigger id="reallocate-user" className="col-span-3 h-8 text-xs">
                            <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                        <SelectContent>
                            {users?.map(user => (
                                <SelectItem key={user.uid} value={user.uid}>{user.displayName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reallocate-task" className="text-right text-xs">Add Task</Label>
                    <Input id="reallocate-task" value={reallocateTask} onChange={(e) => setReallocateTask(e.target.value)} className="col-span-3 h-8 text-xs" placeholder="Optional: Add a task for the new user"/>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reallocate-note" className="text-right text-xs self-start">Note</Label>
                    <Textarea id="reallocate-note" value={reallocateNote} onChange={(e) => setReallocateNote(e.target.value)} className="col-span-3 text-xs" placeholder="Reason for reallocation..."/>
                </div>
            </div>
            <DialogFooter>
                 <DialogClose asChild>
                    <Button type="button" variant="outline" className="h-8 text-xs">Cancel</Button>
                </DialogClose>
                <Button onClick={handleConfirmReallocate} disabled={isSubmitting || !reallocateTo} className="h-8 text-xs">
                    {isSubmitting ? 'Reallocating...' : 'Reallocate'}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
