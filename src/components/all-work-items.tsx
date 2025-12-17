'use client';

import { useMemo, useState, useEffect } from 'react';
import { collection, query, updateDoc, addDoc, doc } from 'firebase/firestore';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useTabs } from '@/contexts/tab-context';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { deleteWorkItem } from '@/ai/flows/delete-work-item-flow';
import { Label } from './ui/label';
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
  const [usersForReallocation, setUsersForReallocation] = useState<User[]>([]);
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [reallocationNote, setReallocationNote] = useState('');

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

  useEffect(() => {
    if (usersData) {
      setUsersForReallocation(usersData);
    }
  }, [usersData]);


  const usersMap = useMemo(() => {
    if (!usersData) return new Map();
    return new Map(usersData.map((u) => [u.uid, u.displayName]));
  }, [usersData]);

  const handleRowClick = (item: WorkItem) => {
    openTab({
      id: item.id,
      title: item.customId,
      type: 'work-item',
    });
  };

  const handleDeleteClick = (e: React.MouseEvent, item: WorkItem) => {
    e.stopPropagation(); // Prevent row click from firing
    setItemToDelete(item);
  };

   const handleReallocateClick = (e: React.MouseEvent, item: WorkItem) => {
    e.stopPropagation();
    setItemToReallocate(item);
  };
  
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      const result = await deleteWorkItem({ id: itemToDelete.id });
      if (result.success) {
        toast({
          title: 'Work Item Deleted',
          description: `Work Item "${itemToDelete.customId}" has been permanently deleted.`,
        });
      } else {
        throw new Error(result.error || 'An unknown error occurred.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Deleting Work Item',
        description: error.message,
      });
    } finally {
      setItemToDelete(null);
    }
  };

  const handleConfirmReallocate = async () => {
    if (!itemToReallocate || !newAssigneeId || !firestore || !currentUser) return;

    const workItemRef = doc(firestore, 'work_items', itemToReallocate.id);
    const notesCollectionRef = collection(firestore, `work_items/${itemToReallocate.id}/notes`);
    const newAssigneeName = usersMap.get(newAssigneeId) || 'Unknown User';

    try {
      // Non-blocking update
      updateDoc(workItemRef, {
        assignedTo: newAssigneeId,
        updatedAt: new Date().toISOString(),
      });

      addDoc(notesCollectionRef, {
        authorId: currentUser.uid,
        text: `Work item reallocated to ${newAssigneeName}. ${reallocationNote}`,
        createdAt: new Date().toISOString(),
        workItemId: itemToReallocate.id,
        category: 'Reallocation',
        subject: 'Work Item Reallocated',
      });
      
      toast({
        title: 'Work Item Reallocated',
        description: `Work item "${itemToReallocate.customId}" has been reallocated to ${newAssigneeName}.`,
      });

    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'Error Reallocating Item',
        description: error.message,
      });
    } finally {
      setItemToReallocate(null);
      setNewAssigneeId('');
      setReallocationNote('');
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
          <div className="flex items-center gap-4">
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
                <TableHead className="text-xs">Subject</TableHead>
                <TableHead className="w-[180px] text-xs">Customer Name</TableHead>
                <TableHead className="w-[180px] text-xs">Assigned To</TableHead>
                <TableHead className="w-[180px] text-xs">Date</TableHead>
                <TableHead className="w-[120px] text-center text-xs">Actions</TableHead>
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
                    <TableCell className="py-1 px-4 text-center">
                      <div className="flex justify-center items-center gap-2">
                         <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => handleReallocateClick(e, item)}>
                          <RefreshCw className="h-4 w-4 text-blue-600" />
                          <span className="sr-only">Reallocate</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => handleDeleteClick(e, item)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the work item "{itemToDelete?.customId}" and all of its associated notes.
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

       <Dialog open={!!itemToReallocate} onOpenChange={(open) => { if (!open) { setItemToReallocate(null); setNewAssigneeId(''); setReallocationNote(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reallocate Work Item: {itemToReallocate?.customId}</DialogTitle>
            <DialogDescription>
              Assign this work item to a different user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="assignee">New Assignee</Label>
              <Select onValueChange={setNewAssigneeId} value={newAssigneeId}>
                <SelectTrigger id="assignee">
                  <SelectValue placeholder="Select a user to assign" />
                </SelectTrigger>
                <SelectContent>
                  {usersForReallocation.map((user) => (
                    <SelectItem key={user.uid} value={user.uid}>
                      {user.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Reallocation Note</Label>
              <Textarea
                id="note"
                placeholder="Provide a reason for reallocating (optional)..."
                value={reallocationNote}
                onChange={(e) => setReallocationNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemToReallocate(null)}>Cancel</Button>
            <Button onClick={handleConfirmReallocate} disabled={!newAssigneeId}>Reallocate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
