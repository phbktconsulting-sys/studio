
'use client';

import { useMemo, useState, useEffect } from 'react';
import type { Note, Task, WorkItem, User, WorkItemFormValues } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Briefcase, Mail, Phone, User as UserIcon, FilePenLine, RefreshCw, Paperclip, MoreVertical, Lock, Home, History, CalendarIcon, MessageSquare } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useFirebase, useDoc, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, orderBy, limit, where, getDocs } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { CustomCalendar } from './custom-calendar';
import { useToast } from '@/hooks/use-toast';
import { NotesTab } from './notes-tab';
import { createWorkItem } from '@/ai/flows/create-work-item-flow';
import { useTabs } from '@/contexts/tab-context';

const processTypes = [
  'Request Information',
  'Request Quotation',
  'Request Application',
  'Request Website',
  'Request inquiry',
  'Request Backend Support',
  'Request Other',
];

function TasksTab({ tasks, workItemId }: { tasks: Task[]; workItemId: string }) {
  const { firestore } = useFirebase();
  const [usersMap, setUsersMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const fetchTaskUsers = async () => {
      if (!firestore || !tasks || tasks.length === 0) return;

      const userIds = [...new Set(tasks.map(task => task.completedBy).filter(Boolean) as string[])];
      const idsToFetch = userIds.filter(id => !usersMap.has(id));
      
      if (idsToFetch.length === 0) return;

      const newUsersMap = new Map<string, string>(usersMap);
      
      // Firestore 'in' query is limited to 30 items. 
      // If you expect more, you'd need to batch this.
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('uid', 'in', idsToFetch.slice(0,30)));
      
      try {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          const userData = doc.data() as User;
          newUsersMap.set(userData.uid, userData.displayName || 'Unknown User');
        });
        setUsersMap(newUsersMap);
      } catch (error) {
        // This will fail for non-admins due to security rules, but we can degrade gracefully.
        console.warn("Could not fetch user profiles for tasks:", error);
        // For users that couldn't be fetched, just show their ID
        idsToFetch.forEach(id => {
          if (!newUsersMap.has(id)) {
            newUsersMap.set(id, id);
          }
        });
        setUsersMap(newUsersMap);
      }
    };

    fetchTaskUsers();
  }, [tasks, firestore, usersMap]);


  const handleTaskCheck = (taskId: string, completed: boolean) => {
    // This function is kept for potential future use but checkboxes are disabled
    if (!firestore) return;
    const workItemRef = doc(firestore, 'work_items', workItemId);
    const currentTasks = tasks || [];
    const updatedTasks = currentTasks.map(task =>
      task.id === taskId ? { ...task, completed } : task
    );
    updateDocumentNonBlocking(workItemRef, { tasks: updatedTasks });
  };

  if (!tasks || tasks.length === 0) {
    return <p className="text-xs p-4 text-muted-foreground">No tasks for this work item.</p>;
  }

  return (
    <div className="space-y-4 p-4">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-start justify-between rounded-md border p-4">
          <div className="flex items-center space-x-3">
            <Checkbox
              id={`task-${task.id}`}
              checked={task.completed}
              disabled // Disabling the checkbox
            />
            <label
              htmlFor={`task-${task.id}`}
              className={`text-xs font-medium leading-none ${task.completed ? 'line-through text-muted-foreground' : ''} ${!task.completed ? 'peer-disabled:cursor-not-allowed peer-disabled:opacity-70' : ''}`}
            >
              {task.text}
            </label>
          </div>
          {task.completed && (
            <div className="text-xs text-muted-foreground">
              Completed by {usersMap.get(task.completedBy || '') || '...'} on {task.completedAt ? format(parseISO(task.completedAt), 'MMM d, yyyy') : '...'}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function VerifyAuthorityForm({ workItem, onCancel }: { workItem: WorkItem; onCancel: () => void }) {
  const { firestore, user, role } = useFirebase();
  const { openTab } = useTabs();
  const { toast } = useToast();

  const [selectedAction, setSelectedAction] = useState<string>('resolve-complete');
  
  // Form field states
  const [resolveCompleteNotes, setResolveCompleteNotes] = useState('');
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});

  const [reindexToProcess, setReindexToProcess] = useState('');
  const [reindexReason, setReindexReason] = useState('');
  const [reindexNotes, setReindexNotes] = useState('');

  const [terminateReason, setTerminateReason] = useState('');
  const [terminateNotes, setTerminateNotes] = useState('');
  const [resolveCloseResolved, setResolveCloseResolved] = useState('');
  const [resolveCloseNotes, setResolveCloseNotes] = useState('');
  const [transferToUser, setTransferToUser] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [pendUntilDate, setPendUntilDate] = useState<Date>();
  const [pendReason, setPendReason] = useState('');
  const [pendNotes, setPendNotes] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // Fetch users only when transfer action is selected by an admin
  useEffect(() => {
    async function fetchUsers() {
      if (selectedAction === 'transfer' && role === 'Admin' && firestore) {
        setIsLoadingUsers(true);
        const usersCol = collection(firestore, 'users');
        const userSnapshot = await getDocs(usersCol);
        const userList = userSnapshot.docs.map(doc => doc.data() as User);
        setUsers(userList);
        setIsLoadingUsers(false);
      }
    }
    fetchUsers();
  }, [selectedAction, role, firestore]);
  
  const getActionDisplayName = (actionValue: string) => {
    const actionMap: { [key: string]: string } = {
        'resolve-complete': 'RESOLVE COMPLETE',
        're-index': 'RE-INDEX',
        'terminate': 'TERMINATE',
        'resolve-close': 'RESOLVE CLOSE',
        'transfer': 'TRANSFER',
        'pend': 'PEND'
    };
    return actionMap[actionValue] || 'VERIFY CUSTOMER AUTHORITY';
  }

  const handleTaskToggle = (taskId: string) => {
    setCompletedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore || !selectedAction) return;

    const workItemRef = doc(firestore, 'work_items', workItem.id);
    const notesCollectionRef = collection(firestore, `work_items/${workItem.id}/notes`);
    
    let noteText = '';
    let category = '';
    let workItemUpdate: Partial<WorkItem> & { [key: string]: any } = { 
        updatedAt: new Date().toISOString(),
        lockInfo: null // Unlock on submit
    };
    let subjectForNote = getActionDisplayName(selectedAction).replace(/\s+/g, ' ').trim();

    try {
        switch(selectedAction) {
        case 'resolve-complete': {
            category = 'Resolved/Completed';
            const now = new Date().toISOString();
            const completedTaskIds = Object.keys(completedTasks).filter(id => completedTasks[id]);
            const completedTaskTexts = (workItem.tasks || []).filter(t => completedTaskIds.includes(t.id)).map(t => t.text);

            const updatedTasks = (workItem.tasks || []).map(task => {
                if (completedTaskIds.includes(task.id) && !task.completed) {
                    return {
                        ...task,
                        completed: true,
                        completedBy: user.uid,
                        completedAt: now,
                    };
                }
                return task;
            });

            noteText = `Work item resolved. Completed tasks: [${completedTaskTexts.join(', ') || 'None'}]. ${resolveCompleteNotes}`;
            workItemUpdate.status = 'Closed';
            workItemUpdate.tasks = updatedTasks;
            break;
        }
        case 're-index':
            if (!reindexToProcess) {
                toast({ variant: 'destructive', title: 'Error', description: 'Please select a process to re-index to.' });
                return;
            }
            category = 'Re-Indexed';

            const reindexPayload = {
              process: reindexToProcess,
              urgency: workItem.urgency,
              assignedTo: user.uid,
              createdBy: user.uid,
              relatedContact: workItem.relatedContact,
              overview: `Re-indexed from ${workItem.customId}. Original overview: ${workItem.overview}`,
              tasks: [], 
            };
            
            const newWorkItemResult = await createWorkItem(reindexPayload);
            if (!newWorkItemResult.id || !newWorkItemResult.customId) {
                throw new Error(newWorkItemResult.error || 'Failed to create new work item during re-index.');
            }

            noteText = `Case re-indexed to new Process '${reindexToProcess}'. New Case ID: ${newWorkItemResult.customId}. Reason: ${reindexReason}. ${reindexNotes}`;
            workItemUpdate.status = 'Re-indexed';

             toast({
                title: 'Work Item Re-Indexed',
                description: `Successfully created new work item ${newWorkItemResult.customId}.`,
            });
            openTab({ id: newWorkItemResult.id, title: newWorkItemResult.customId, type: 'work-item' });

            break;
        case 'terminate':
            category = 'Terminated';
            noteText = `Reason: ${terminateReason}. ${terminateNotes}`;
            workItemUpdate.status = 'Closed';
            break;
        case 'resolve-close':
            category = 'Resolved/Closed';
            noteText = `Customer request resolved: ${resolveCloseResolved}. ${resolveCloseNotes}`;
            workItemUpdate.status = 'Closed';
            break;
        case 'transfer':
            category = 'Transferred';
            noteText = `${transferNotes}`;
            workItemUpdate.assignedTo = transferToUser;
            break;
        case 'pend':
            category = 'Pended';
            noteText = `Pend until: ${pendUntilDate ? format(pendUntilDate, 'yyyy-MM-dd') : 'N/A'}. Reason: ${pendReason}. ${pendNotes}`;
            workItemUpdate.status = 'Pending';
            break;
        default:
            return;
        }
        
        // 1. Add the note to the original work item
        addDocumentNonBlocking(notesCollectionRef, {
        authorId: user.uid,
        author: user.displayName || user.email || 'System',
        text: noteText,
        createdAt: new Date().toISOString(),
        workItemId: workItem.id,
        category,
        subject: subjectForNote,
        });
        
        // 2. Update the original work item
        updateDocumentNonBlocking(workItemRef, workItemUpdate);

        toast({
        title: "Action Submitted",
        description: `The action '${subjectForNote}' was successfully logged and applied.`,
        });

        onCancel(); // Hide form after submission
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Action Failed',
            description: error.message || 'An unexpected error occurred.',
        });
    }
  };

  const renderActionForm = () => {
    switch (selectedAction) {
      case 'resolve-complete': {
          const openTasks = (workItem.tasks || []).filter(task => !task.completed);
          if (openTasks.length === 0) {
              return (
                  <div className="space-y-2">
                     <p className="text-xs text-muted-foreground">All tasks for this work item are already completed.</p>
                     <Label className="text-xs font-normal" htmlFor="notes-resolve-complete">Notes</Label>
                     <Textarea id="notes-resolve-complete" placeholder="Add notes..." value={resolveCompleteNotes} onChange={e => setResolveCompleteNotes(e.target.value)} className="text-xs min-h-[60px]" />
                  </div>
              )
          }
          return (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold">Complete Tasks</Label>
                <div className="mt-2 space-y-2 rounded-md border p-2">
                  {openTasks.map(task => (
                    <div key={task.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`task-complete-${task.id}`}
                        checked={!!completedTasks[task.id]}
                        onCheckedChange={() => handleTaskToggle(task.id)}
                      />
                      <label htmlFor={`task-complete-${task.id}`} className="text-xs text-muted-foreground">
                        {task.text}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold" htmlFor="notes-resolve-complete">Notes</Label>
                <Textarea id="notes-resolve-complete" placeholder="Add notes..." value={resolveCompleteNotes} onChange={e => setResolveCompleteNotes(e.target.value)} className="text-xs min-h-[60px] mt-1" />
              </div>
            </div>
          );
      }
      case 're-index':
        return (
          <div className="grid grid-cols-[max-content_1fr] items-center gap-x-4 gap-y-2">
            <Label className="text-xs font-normal text-right">Re-Index to Process</Label>
            <Select onValueChange={setReindexToProcess} value={reindexToProcess}>
              <SelectTrigger className="text-xs h-6">
                <SelectValue placeholder="Select a new process..." />
              </SelectTrigger>
              <SelectContent>
                 {processTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                        {type}
                    </SelectItem>
                 ))}
              </SelectContent>
            </Select>

            <Label className="text-xs font-normal text-right">Reason *</Label>
            <Select onValueChange={setReindexReason} value={reindexReason}>
              <SelectTrigger className="text-xs h-6">
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Wrong Process">Wrong Process</SelectItem>
                <SelectItem value="Incorrect Data">Incorrect Data</SelectItem>
              </SelectContent>
            </Select>

            <Label className="text-xs font-normal text-right self-start" htmlFor="notes-re-index">Note *</Label>
            <Textarea id="notes-re-index" placeholder="Add notes..." value={reindexNotes} onChange={e => setReindexNotes(e.target.value)} className="text-xs min-h-[60px]" />
          </div>
        );
      case 'terminate':
        return (
          <div className="grid grid-cols-[max-content_1fr] items-center gap-x-4 gap-y-2">
            <Label className="text-xs font-normal text-right">Reason</Label>
            <Select onValueChange={setTerminateReason} value={terminateReason}>
              <SelectTrigger className="text-xs h-6">
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Customer Request">Customer Request</SelectItem>
                <SelectItem value="Potential Fraud">Potential Fraud</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Label className="text-xs font-normal text-right self-start" htmlFor="notes-terminate">Notes</Label>
            <Textarea id="notes-terminate" placeholder="Add notes..." value={terminateNotes} onChange={e => setTerminateNotes(e.target.value)} className="text-xs min-h-[60px]" />
          </div>
        );
      case 'resolve-close':
         return (
          <div className="grid grid-cols-['max-content'_1fr] items-center gap-x-4 gap-y-2">
            <Label className="text-xs font-normal text-right">Customer request resolved?</Label>
            <Select onValueChange={setResolveCloseResolved} value={resolveCloseResolved}>
              <SelectTrigger className="text-xs h-6">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
            <Label className="text-xs font-normal text-right self-start" htmlFor="notes-resolve-close">Notes</Label>
            <Textarea id="notes-resolve-close" placeholder="Add notes..." value={resolveCloseNotes} onChange={e => setResolveCloseNotes(e.target.value)} className="text-xs min-h-[60px]" />
          </div>
        );
      case 'transfer':
        if (role !== 'Admin') {
            return <p className="text-xs text-muted-foreground p-4 text-center">You do not have permission to transfer work items.</p>;
        }
        if (isLoadingUsers) {
            return <p className="text-xs text-muted-foreground p-4 text-center">Loading users...</p>;
        }
        return (
          <div className="grid grid-cols-['max-content'_1fr] items-center gap-x-4 gap-y-2">
            <Label className="text-xs font-normal text-right">Transfer to User</Label>
            <Select onValueChange={setTransferToUser} value={transferToUser}>
              <SelectTrigger className="text-xs h-6">
                <SelectValue placeholder="Select user..." />
              </SelectTrigger>
              <SelectContent>
                 {users.map(user => (
                  <SelectItem key={user.uid} value={user.uid}>{user.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label className="text-xs font-normal text-right self-start" htmlFor="notes-transfer">Notes</Label>
            <Textarea id="notes-transfer" placeholder="Add notes..." value={transferNotes} onChange={e => setTransferNotes(e.target.value)} className="text-xs min-h-[60px]" />
          </div>
        );
      case 'pend':
        return (
          <div className="grid grid-cols-['max-content'_1fr] items-center gap-x-4 gap-y-2">
            <Label className="text-xs font-normal text-right">Pend until date</Label>
            <CustomCalendar value={pendUntilDate} onChange={setPendUntilDate} />
            <Label className="text-xs font-normal text-right">Reason for pend</Label>
            <Select onValueChange={setPendReason} value={pendReason}>
              <SelectTrigger className="text-xs h-6">
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Information Needed">Information Needed</SelectItem>
                <SelectItem value="Customer Unavailable">Customer Unavailable</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Label className="text-xs font-normal text-right self-start" htmlFor="notes-pend">Notes</Label>
            <Textarea id="notes-pend" placeholder="Add notes..." value={pendNotes} onChange={e => setPendNotes(e.target.value)} className="text-xs min-h-[60px]" />
          </div>
        );
      default:
        return <p className="text-xs text-muted-foreground p-4 text-center">Please select an action to continue.</p>;
    }
  };

  const actionOptions = [
      { value: 'resolve-complete', label: 'Resolve Complete' },
      { value: 're-index', label: 'Re-Index' },
      { value: 'terminate', label: 'Terminate' },
      { value: 'resolve-close', label: 'Resolve Close' },
      { value: 'transfer', label: 'Transfer', adminOnly: true },
      { value: 'pend', label: 'Pend' }
  ];
  
  const availableActions = actionOptions.filter(opt => !(opt.adminOnly && role !== 'Admin'));


  return (
    <form onSubmit={handleSubmit}>
      <Card className="mt-4 border-primary border">
        <CardHeader className="p-2 bg-slate-100 flex-row items-center gap-4">
          <CardTitle className="text-xs font-bold uppercase">
            {getActionDisplayName(selectedAction)}
          </CardTitle>
          <Select onValueChange={(value) => setSelectedAction(value as string)}>
            <SelectTrigger className="text-xs h-7 w-auto flex-1 bg-black text-white hover:bg-black/90 focus:ring-black">
                <SelectValue placeholder="-- Or select a different action --" />
            </SelectTrigger>
            <SelectContent>
                {availableActions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className='p-4'>
          <div>
            {renderActionForm()}
          </div>
        </CardContent>
      </Card>
      
      {selectedAction && (
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="h-6 py-0">
            Cancel
          </Button>
          <Button type="submit" disabled={!selectedAction} className="h-6 py-0">
            Submit
          </Button>
        </div>
      )}
    </form>
  );
}

function ClosedWorkItemInfo({ workItem }: { workItem: WorkItem }) {
    const { firestore } = useFirebase();

    const lastNoteQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, `work_items/${workItem.id}/notes`),
            orderBy('createdAt', 'desc'),
            limit(1)
        );
    }, [firestore, workItem.id]);

    const { data: lastNoteArr } = useCollection<Note>(lastNoteQuery);
    const lastNote = lastNoteArr?.[0];

    const authorUserRef = useMemoFirebase(() => {
        if (!firestore || !lastNote?.authorId) return null;
        return doc(firestore, 'users', lastNote.authorId);
    }, [firestore, lastNote?.authorId]);

    const { data: authorUser } = useDoc<User>(authorUserRef);
    
    let statusText = `Work Item ${workItem.status}.`;
    if (lastNote) {
        if (workItem.status === 'Re-indexed') {
            const newCaseId = lastNote.text.match(/New Case ID: (\S+)\./)?.[1] || 'N/A';
            statusText = `Work Item Re-indexed to Case ID: ${newCaseId}.`;
        } else if (lastNote.category === 'Terminated') {
            const reason = lastNote.text.split('Reason: ')[1]?.split('.')[0] || 'Not specified';
            statusText = `Work Item Terminated. Reason: ${reason}.`;
        } else if (lastNote.category === 'Resolved/Completed' || lastNote.category === 'Resolved/Close') {
            const reason = lastNote.text.split('. ')[0] || 'Not specified';
             statusText = `Work Item Closed. Reason: ${reason}`;
        }
    }


    return (
        <div className="flex items-center gap-4 text-xs py-2">
            <Lock className="h-5 w-5 text-destructive" />
            <span className="font-medium">Work Item {workItem.status}:</span>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-muted-foreground">Action by {authorUser?.displayName || lastNote?.author || '...'}</span>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-muted-foreground">{statusText}</span>
        </div>
    );
}

function CaseLockedInfo({ lockInfo }: { lockInfo: WorkItem['lockInfo'] }) {
    return (
        <div className="flex items-center gap-4 text-xs py-2 text-destructive">
            <Lock className="h-5 w-5" />
            <span className="font-bold">Case is currently locked by:</span>
            <span className="font-medium">{lockInfo?.userName || 'another user'}</span>
        </div>
    );
}

export function WorkItemView({ workItemId, customId }: { workItemId: string, customId: string }) {
  const { firestore, user: currentUser } = useFirebase();
  const [isVerifyingAuthority, setIsVerifyingAuthority] = useState(false);

  const workItemRef = useMemoFirebase(() => {
      if (!firestore) return null;
      return doc(firestore, 'work_items', workItemId);
  }, [firestore, workItemId]);

  const { data: item, isLoading: isWorkItemLoading } = useDoc<WorkItem>(workItemRef);
  
  const assignedUserRef = useMemoFirebase(() => {
    if (!firestore || !item?.assignedTo) return null;
    return doc(firestore, 'users', item.assignedTo);
  }, [firestore, item?.assignedTo]);
  
  const createdByUserRef = useMemoFirebase(() => {
    if (!firestore || !item?.createdBy) return null;
    return doc(firestore, 'users', item.createdBy);
  }, [firestore, item?.createdBy]);

  const latestNoteQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
        collection(firestore, `work_items/${workItemId}/notes`),
        orderBy('createdAt', 'desc'),
        limit(1)
    );
  }, [firestore, workItemId]);

  const { data: assignedUser, isLoading: isUserLoading } = useDoc<User>(assignedUserRef);
  const { data: createdByUser, isLoading: isCreatorLoading } = useDoc<User>(createdByUserRef);
  const { data: latestNoteArr, isLoading: isNoteLoading } = useCollection<Note>(latestNoteQuery);
  const latestNote = latestNoteArr?.[0];


  const isLoading = isWorkItemLoading || isUserLoading || isCreatorLoading || isNoteLoading;

  const caseAge = item ? differenceInDays(new Date(), parseISO(item.createdAt)) : 0;
  
  const handleVerifyClick = () => {
    if (!item || !currentUser || !workItemRef) return;
    
    // Case is not locked, so lock it for the current user
    const lockInfo = {
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Unknown User',
        timestamp: new Date().toISOString()
    };
    updateDocumentNonBlocking(workItemRef, { lockInfo });
    setIsVerifyingAuthority(true);
  };
  
  const handleCancelVerify = () => {
    if (!workItemRef) return;
    // Unlock the case
    updateDocumentNonBlocking(workItemRef, { lockInfo: null });
    setIsVerifyingAuthority(false);
  }

  if (isLoading || !item) {
    return (
       <div className="flex h-full w-full items-center justify-center p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  const PlaceholderContent = ({ title }: { title: string }) => (
    <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 p-6">
      <p className="text-xs text-muted-foreground">{title} (Not Implemented)</p>
    </div>
  );

  const isClosed = item.status === 'Closed' || item.status === 'Re-indexed';
  const isLockedByOther = item.lockInfo && item.lockInfo.userId !== currentUser?.uid;

  return (
    <div className="flex h-full flex-col bg-slate-100">
       <header className="flex flex-col gap-2 border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm font-medium">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
            <span className="font-headline text-lg">{item.process}</span>
            <Separator orientation="vertical" className="h-5" />
            <span>Status: <span className="text-muted-foreground">{item.status}</span></span>
            <Separator orientation="vertical" className="h-5" />
            <span>Case Age: <span className="text-muted-foreground">{caseAge} days</span></span>
          </div>
          <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <FilePenLine className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
          </div>
        </div>
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <span>Created: {format(parseISO(item.createdAt), 'dd/MM/yyyy HH:mm')}</span>
          <span>Inbound Method: Manual</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-0">
         <div className="mt-4 mb-4">
            <h2 className="text-base font-semibold">Processes</h2>
            <Separator className="bg-[#A60A0A] h-[2px]" />
             {isVerifyingAuthority ? (
              <VerifyAuthorityForm workItem={item} onCancel={handleCancelVerify} />
            ) : isClosed ? (
              <ClosedWorkItemInfo workItem={item} />
            ) : isLockedByOther ? (
                <CaseLockedInfo lockInfo={item.lockInfo!} />
            ) : (
              <div className="flex items-center gap-4 text-sm py-2">
                  <span className="font-medium">Assigned To:</span>
                  <span>{assignedUser?.displayName || '...'}</span>
                  <Button onClick={handleVerifyClick} className="h-7 text-xs bg-black text-white hover:bg-black/80">
                    Verify Customer Authority
                  </Button>
              </div>
            )}
         </div>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex h-auto rounded-none bg-transparent p-0">
            <TabsTrigger value="overview" className="relative flex-1 justify-center h-7 rounded-none border-b-2 border-transparent bg-[#A60A0A] px-1 text-xs text-white transition-none hover:bg-[#A60A0A]/80 data-[state=active]:border-transparent data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none">Work Overview</TabsTrigger>
            <TabsTrigger value="notes" className="relative flex-1 justify-center h-7 rounded-none border-b-2 border-transparent bg-[#A60A0A] px-1 text-xs text-white transition-none hover:bg-[#A60A0A]/80 data-[state=active]:border-transparent data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none">Notes</TabsTrigger>
            <TabsTrigger value="contact" className="relative flex-1 justify-center h-7 rounded-none border-b-2 border-transparent bg-[#A60A0A] px-1 text-xs text-white transition-none hover:bg-[#A60A0A]/80 data-[state=active]:border-transparent data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none">Contact Info</TabsTrigger>
            <TabsTrigger value="images" className="relative flex-1 justify-center h-7 rounded-none border-b-2 border-transparent bg-[#A60A0A] px-1 text-xs text-white transition-none hover:bg-[#A60A0A]/80 data-[state=active]:border-transparent data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none">Images</TabsTrigger>
            <TabsTrigger value="associations" className="relative flex-1 justify-center h-7 rounded-none border-b-2 border-transparent bg-[#A60A0A] px-1 text-xs text-white transition-none hover:bg-[#A60A0A]/80 data-[state=active]:border-transparent data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none">Associations</TabsTrigger>
            <TabsTrigger value="tasks" className="relative flex-1 justify-center h-7 rounded-none border-b-2 border-transparent bg-[#A60A0A] px-1 text-xs text-white transition-none hover:bg-[#A60A0A]/80 data-[state=active]:border-transparent data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none">Tasks</TabsTrigger>
            <TabsTrigger value="policy" className="relative flex-1 justify-center h-7 rounded-none border-b-2 border-transparent bg-[#A60A0A] px-1 text-xs text-white transition-none hover:bg-[#A60A0A]/80 data-[state=active]:border-transparent data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none">Policy</TabsTrigger>
            <TabsTrigger value="agency" className="relative flex-1 justify-center h-7 rounded-none border-b-2 border-transparent bg-[#A60A0A] px-1 text-xs text-white transition-none hover:bg-[#A60A0A]/80 data-[state=active]:border-transparent data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none">Agency</TabsTrigger>
          </TabsList>
          
          <div className="mt-0 bg-card px-2 border-t-0">
             <TabsContent value="overview" className="mt-0">
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Work Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start text-xs">
                        <UserIcon className="h-4 w-4 mr-3 mt-0.5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">Created By</p>
                          <p className="text-muted-foreground">{createdByUser?.displayName || 'N/A'}</p>
                        </div>
                    </div>
                     <div className="flex items-start text-xs">
                        <CalendarIcon className="h-4 w-4 mr-3 mt-0.5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">Created On</p>
                          <p className="text-muted-foreground">{format(parseISO(item.createdAt), "PPP p")}</p>
                        </div>
                    </div>
                     <div className="flex items-start text-xs">
                        <History className="h-4 w-4 mr-3 mt-0.5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">Last Updated</p>
                          <p className="text-muted-foreground">{format(parseISO(item.updatedAt), "PPP p")}</p>
                        </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                   <CardHeader>
                    <CardTitle className="text-sm">Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                     <p className="text-xs text-muted-foreground whitespace-pre-wrap">{item.overview}</p>
                  </CardContent>
                </Card>

                {(item.tasks?.length > 0 || latestNote) && (
                   <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {item.tasks?.length > 0 && (
                      <Card>
                          <CardHeader>
                              <CardTitle className="text-sm">Initial Task</CardTitle>
                          </CardHeader>
                          <CardContent>
                              <p className="text-xs text-muted-foreground">{item.tasks[0].text}</p>
                          </CardContent>
                      </Card>
                    )}
                    
                    {latestNote && (
                        <Card>
                           <CardHeader>
                                <CardTitle className="text-sm">Latest Update</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex items-start text-xs">
                                    <MessageSquare className="h-4 w-4 mr-3 mt-0.5 text-muted-foreground" />
                                    <div className="flex-1">
                                        <p className="font-medium">{latestNote.subject}</p>
                                        <p className="text-muted-foreground">{latestNote.text}</p>
                                        <p className="text-xs text-muted-foreground/70 pt-1">
                                            - {latestNote.author} on {format(parseISO(latestNote.createdAt), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                   </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="notes" className="mt-0">
              <NotesTab workItemId={item.id} />
            </TabsContent>

            <TabsContent value="contact" className="mt-0">
              <Card className="border-0 shadow-none">
                <CardHeader className="p-4">
                  <CardTitle className="text-xs">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0">
                  <div className="flex items-center gap-4 text-xs">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Name:</span>
                      <span className="text-muted-foreground">{item.relatedContact.name}</span>
                  </div>
                   {item.relatedContact.address && (
                    <div className="flex items-start gap-4 text-xs">
                        <Home className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex flex-col">
                           <span className="font-medium">Address:</span>
                           <span className="text-muted-foreground">{item.relatedContact.address}</span>
                        </div>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Email:</span>
                      <a href={`mailto:${item.relatedContact.email}`} className="text-primary hover:underline">{item.relatedContact.email}</a>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Phone:</span>
                      <span className="text-muted-foreground">{item.relatedContact.phone}</span>
                  </div>
                  {item.relatedContact.phoneSecondary && (
                    <div className="flex items-center gap-4 text-xs">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Secondary Phone:</span>
                        <span className="text-muted-foreground">{item.relatedContact.phoneSecondary}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks" className="mt-0">
              <TasksTab tasks={item.tasks || []} workItemId={item.id} />
            </TabsContent>

            <TabsContent value="images" className="mt-0">
              <PlaceholderContent title="Images" />
            </TabsContent>
            <TabsContent value="associations" className="mt-0">
               <Card className="border-0 shadow-none">
                <CardHeader className="p-4">
                  <CardTitle className="text-xs">Customer Associations</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {item.relatedContact.customerUniqueId ? (
                    <div className="flex items-center gap-4 text-xs">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Customer:</span>
                        <span className="text-muted-foreground">{item.relatedContact.name}</span>
                        <Separator orientation="vertical" className="h-4" />
                         <span className="font-medium">Unique ID:</span>
                        <span className="font-mono text-muted-foreground">{item.relatedContact.customerUniqueId}</span>
                    </div>
                  ) : (
                     <p className="text-xs text-muted-foreground">No unique customer ID associated with this work item.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="policy" className="mt-0">
              <PlaceholderContent title="Policy" />
            </TabsContent>
            <TabsContent value="agency" className="mt-0">
              <PlaceholderContent title="Agency" />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
