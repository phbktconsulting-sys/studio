
'use client';

import { useMemo, useState, useEffect } from 'react';
import { collection, query, where, updateDoc, addDoc, getDocs, doc } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
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
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, Trash2, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTabs } from '@/contexts/tab-context';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { deleteWorkItem } from '@/ai/flows/delete-work-item-flow';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

const processTypes = [
  "New Business Request",
  "Development Services (Web & App)",
  "Operations & Support (Backend)",
  "Digital Service Request",
  "Feedback / Complaint",
  "Other Service Request"
];


interface ReallocateDialogProps {
    isOpen: boolean;
    onClose: () => void;
    itemToReallocate: WorkItem | null;
}

function ReallocateDialog({ isOpen, onClose, itemToReallocate }: ReallocateDialogProps) {
    const { firestore, user: currentUser } = useFirebase();
    const { toast } = useToast();
    const [usersForReallocation, setUsersForReallocation] = useState<User[]>([]);
    const [newAssigneeId, setNewAssigneeId] = useState('');

    useEffect(() => {
        async function fetchUsers() {
            if (firestore && isOpen) {
                const usersCol = collection(firestore, 'users');
                const userSnapshot = await getDocs(usersCol);
                const userList = userSnapshot.docs.map(doc => doc.data() as User);
                setUsersForReallocation(userList);
            }
        }
        fetchUsers();
    }, [firestore, isOpen]);
    
    const usersMap = useMemo(() => {
      if (!usersForReallocation) return new Map();
      return new Map(usersForReallocation.map((u) => [u.uid, u.displayName]));
    }, [usersForReallocation]);

    const handleConfirmReallocate = async () => {
        if (!itemToReallocate || !newAssigneeId || !firestore || !currentUser) return;

        const workItemRef = doc(firestore, 'work_items', itemToReallocate.id);
        const notesCollectionRef = collection(firestore, `work_items/${itemToReallocate.id}/notes`);
        const newAssigneeName = usersMap.get(newAssigneeId) || 'Unknown User';

        try {
            await updateDoc(workItemRef, {
                assignedTo: newAssigneeId,
                status: 'Open',
                updatedAt: new Date().toISOString(),
            });

            await addDoc(notesCollectionRef, {
                authorId: currentUser.uid,
                text: `Work item allocated to ${newAssigneeName} from the new items queue.`,
                createdAt: new Date().toISOString(),
                workItemId: itemToReallocate.id,
                category: 'Allocation',
                subject: 'Work Item Allocated',
            });

            toast({
                title: 'Work Item Allocated',
                description: `Work item "${itemToReallocate.customId}" has been allocated to ${newAssigneeName}.`,
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error Allocating Item',
                description: error.message,
            });
        } finally {
            setNewAssigneeId('');
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reallocate Work Item: {itemToReallocate?.customId}</DialogTitle>
                    <DialogDescription>
                        Assign this work item to a user.
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
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleConfirmReallocate} disabled={!newAssigneeId}>Reallocate</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

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
  const { toast } = useToast();

  const [itemToDelete, setItemToDelete] = useState<WorkItem | null>(null);
  const [itemToReallocate, setItemToReallocate] = useState<WorkItem | null>(null);
  const [processFilter, setProcessFilter] = useState('all');
  const [isDownloading, setIsDownloading] = useState(false);

  const workItemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'work_items'),
      where('status', '==', 'Open')
    );
  }, [firestore]);

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
  
  const handleDeleteClick = (e: React.MouseEvent, item: WorkItem) => {
    e.stopPropagation(); 
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

  const sortedItems = useMemo(() => {
    if (!workItems) return [];

    let unassignedItems = workItems.filter(item => {
        return item.assignedTo.length < 28;
    });

    if (processFilter !== 'all') {
      unassignedItems = unassignedItems.filter(item => item.process === processFilter);
    }

    return unassignedItems.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];
  }, [workItems, processFilter]);

  const clearFilters = () => {
    setProcessFilter('all');
  }

  const handleDownloadReport = async () => {
    if (sortedItems.length === 0) {
      toast({ title: 'No Data', description: 'There are no unassigned items to export.' });
      return;
    }
    
    setIsDownloading(true);
    
    try {
        const XLSX = await import('xlsx');
        const reportData = sortedItems.map(item => ({
            'Case ID': item.customId,
            'Subject': item.subject,
            'Process': item.process,
            'Status': item.status,
            'Created By': usersMap.get(item.createdBy) || item.createdBy,
            'Assigned To Queue': item.assignedTo,
            'Created At': format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        }));
        
        const ws = XLSX.utils.json_to_sheet(reportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Unassigned Work Items');
        XLSX.writeFile(wb, 'unassigned_work_items_report.xlsx');
        
        toast({ title: 'Report Downloaded', description: 'The report has been successfully downloaded.' });
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Download Failed', description: error.message || 'An unexpected error occurred.' });
    } finally {
        setIsDownloading(false);
    }
  }

  const isLoading = workItemsLoading || usersLoading;

  return (
    <>
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
            <div>
              <h1 className="font-headline text-lg font-bold tracking-tight">New Unassigned Work Items</h1>
              <p className="text-xs text-muted-foreground">
                Showing all open, unassigned work items.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
                <Select value={processFilter} onValueChange={setProcessFilter}>
                    <SelectTrigger className="h-8 w-full flex-1 min-w-[150px] text-xs">
                        <SelectValue placeholder="Filter by Process" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-xs">All Processes</SelectItem>
                        {processTypes.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                    </SelectContent>
                </Select>
                {processFilter !== 'all' && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearFilters}>
                        <X className="h-4 w-4" />
                        <span className="sr-only">Clear filter</span>
                    </Button>
                )}
                 <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleDownloadReport} disabled={isDownloading}>
                    <Download className="mr-2 h-4 w-4" />
                    {isDownloading ? 'Downloading...' : 'Download Report'}
                </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Total Items:</span>
              <Badge variant="secondary">{sortedItems.length}</Badge>
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
                <TableHead className="w-[120px] text-center text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-4 text-xs">
                    Loading work items...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && sortedItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-4 text-xs">
                    No open, unassigned work items found.
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
                    <TableCell className="text-xs py-1 px-4">{format(new Date(item.createdAt), 'p, MMM d, yyyy')}</TableCell>
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

      <ReallocateDialog 
        isOpen={!!itemToReallocate}
        onClose={() => setItemToReallocate(null)}
        itemToReallocate={itemToReallocate}
      />
    </>
  );
}
