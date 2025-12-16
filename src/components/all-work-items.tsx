
'use client';

import { useMemo, useState } from 'react';
import { collection, query, arrayUnion } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
  UserPlus,
  ListPlus,
} from 'lucide-react';
import { useTabs } from '@/contexts/tab-context';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { deleteWorkItem } from '@/ai/flows/delete-work-item-flow';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
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
  const { firestore, user: adminUser } = useFirebase();
  const { openTab, closeTab } = useTabs();
  const { toast } = useToast();
  
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [isReallocateDialogOpen, setIsReallocateDialogOpen] = useState(false);
  const [isAssignTaskDialogOpen, setIsAssignTaskDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for Reallocation
  const [newAssigneeId, setNewAssigneeId] = useState('');

  // State for Assign Task
  const [newTaskText, setNewTaskText] = useState('');

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

  const handleReallocate = async () => {
    if (!selectedItem || !newAssigneeId || !firestore || !adminUser) return;
    
    const workItemRef = doc(firestore, 'work_items', selectedItem.id);

    const targetUser = users?.find(u => u.uid === newAssigneeId);

    updateDocumentNonBlocking(workItemRef, { assignedTo: newAssigneeId });

    const notesCollectionRef = collection(firestore, `work_items/${selectedItem.id}/notes`);
      addDocumentNonBlocking(notesCollectionRef, {
        authorId: adminUser.uid,
        author: adminUser.displayName || 'Admin',
        text: `Work item reallocated to ${targetUser?.displayName || 'Unknown User'}.`,
        createdAt: new Date().toISOString(),
        workItemId: selectedItem.id,
      });

    toast({
      title: 'Work Item Reallocated',
      description: `${selectedItem.customId} has been assigned to ${targetUser?.displayName}.`
    });

    setIsReallocateDialogOpen(false);
    setSelectedItem(null);
    setNewAssigneeId('');
  };

  const handleAssignTask = async () => {
    if (!selectedItem || !newTaskText.trim() || !firestore || !adminUser) return;
    
    const workItemRef = doc(firestore, 'work_items', selectedItem.id);

    const newTask = {
        id: `task-${Date.now()}`,
        text: newTaskText,
        completed: false,
    };

    updateDocumentNonBlocking(workItemRef, { tasks: arrayUnion(newTask) });

    const notesCollectionRef = collection(firestore, `work_items/${selectedItem.id}/notes`);
    addDocumentNonBlocking(notesCollectionRef, {
      authorId: adminUser.uid,
      author: adminUser.displayName || 'Admin',
      text: `New task added: "${newTaskText}"`,
      createdAt: new Date().toISOString(),
      workItemId: selectedItem.id,
    });

    toast({
        title: 'Task Assigned',
        description: `A new task has been added to ${selectedItem.customId}.`
    });

    setIsAssignTaskDialogOpen(false);
    setSelectedItem(null);
    setNewTaskText('');
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
                  <TableCell onClick={() => handleRowClick(item)} className="cursor-pointer">{usersMap.get(item.assignedTo) || 'Unassigned'}</TableCell>
                  <TableCell onClick={() => handleRowClick(item)} className="cursor-pointer">{format(new Date(item.updatedAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">More actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => { setSelectedItem(item); setIsReallocateDialogOpen(true); }}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          <span>Reallocate</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => { setSelectedItem(item); setIsAssignTaskDialogOpen(true); }}>
                          <ListPlus className="mr-2 h-4 w-4" />
                          <span>Assign Task</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setSelectedItem(item)} className="text-destructive focus:text-destructive">
                           <AlertDialog>
                              <AlertDialogTrigger asChild>
                                  <div className='flex items-center w-full'>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      <span>Delete</span>
                                  </div>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the work item
                                     <span className="font-bold"> {selectedItem?.customId}</span>.
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
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

       {/* Reallocate Dialog */}
      <Dialog open={isReallocateDialogOpen} onOpenChange={setIsReallocateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reallocate Work Item: {selectedItem?.customId}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Label htmlFor="assignee-select">New Assignee</Label>
            <Select onValueChange={setNewAssigneeId} value={newAssigneeId}>
              <SelectTrigger id="assignee-select">
                <SelectValue placeholder="Select a user to assign" />
              </SelectTrigger>
              <SelectContent>
                {users?.map(user => (
                  <SelectItem key={user.uid} value={user.uid}>{user.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <Button onClick={handleReallocate} disabled={!newAssigneeId}>Reallocate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Assign Task Dialog */}
      <Dialog open={isAssignTaskDialogOpen} onOpenChange={setIsAssignTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Task to: {selectedItem?.customId}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Label htmlFor="task-description">Task Description</Label>
            <Textarea
              id="task-description"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Enter the details of the new task..."
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <Button onClick={handleAssignTask} disabled={!newTaskText.trim()}>Assign Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    