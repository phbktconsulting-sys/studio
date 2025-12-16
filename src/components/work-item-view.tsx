
'use client';

import { useMemo, useState } from 'react';
import type { Note, Task, WorkItem, User } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Briefcase, Mail, Phone, User as UserIcon, FilePenLine, RefreshCw, Paperclip, MoreVertical, Lock, Home } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useFirebase, useDoc, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, orderBy, limit } from 'firebase/firestore';
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

function NotesTab({ workItemId }: { workItemId: string }) {
  const { firestore, user } = useFirebase();
  const [noteText, setNoteText] = useState('');

  const notesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, `work_items/${workItemId}/notes`), orderBy('createdAt', 'desc'));
  }, [firestore, workItemId]);

  const { data: notes, isLoading } = useCollection<Note>(notesQuery);

  const handleAddNote = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (noteText.trim() && user && firestore) {
      const notesCollectionRef = collection(firestore, `work_items/${workItemId}/notes`);
      addDocumentNonBlocking(notesCollectionRef, {
        authorId: user.uid,
        author: user.displayName || user.email || 'Anonymous',
        text: noteText,
        createdAt: new Date().toISOString(),
        workItemId: workItemId,
      });
      setNoteText('');
    }
  };
  
   const sortedNotes = useMemo(() => {
    if (!notes) return [];
    return [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notes]);


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add a Note</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddNote} className="space-y-4">
            <Textarea 
              name="note-text" 
              placeholder="Type your note here." 
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <Button type="submit">Save Note</Button>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Author</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="w-[250px]">Date/Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={3}>Loading notes...</TableCell></TableRow>}
              {notes && notes.map((note) => (
                <TableRow key={note.id}>
                  <TableCell className="font-medium">{note.author}</TableCell>
                  <TableCell>{note.text}</TableCell>
                  <TableCell>{format(new Date(note.createdAt), 'dd MMM yyyy HH:mm:ss')}</TableCell>
                </TableRow>
              ))}
              {notes && notes.length === 0 && !isLoading && (
                 <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      No notes have been added yet.
                    </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function TasksTab({ tasks }: { tasks: Task[] }) {
  if (!tasks || tasks.length === 0) {
    return <p>No tasks for this work item.</p>;
  }

  return (
    <div className="space-y-4">
       {tasks.map((task) => (
          <div key={task.id} className="flex items-center space-x-3 rounded-md border p-4">
            <Checkbox id={`task-${task.id}`} checked={task.completed} />
            <label
              htmlFor={`task-${task.id}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {task.text}
            </label>
          </div>
        ))}
    </div>
  );
}

function VerifyAuthorityForm({ workItem, onCancel }: { workItem: WorkItem; onCancel: () => void }) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const [selectedAction, setSelectedAction] = useState<string>('');
  
  // Form field states
  const [resolveCompleteCall, setResolveCompleteCall] = useState('');
  const [resolveCompleteNotes, setResolveCompleteNotes] = useState('');
  const [reindexOption, setReindexOption] = useState('myself');
  const [reindexReason, setReindexReason] = useState('');
  const [reindexCopyNotes, setReindexCopyNotes] = useState('yes');
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


  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: users } = useCollection<User>(usersQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore || !selectedAction) return;

    const workItemRef = doc(firestore, 'work_items', workItem.id);
    const notesCollectionRef = collection(firestore, `work_items/${workItem.id}/notes`);
    
    let noteText = '';
    let workItemUpdate: Partial<WorkItem> = { updatedAt: new Date().toISOString() };

    switch(selectedAction) {
      case 'resolve-complete':
        noteText = `Work Item Resolved/Completed. Call to customer: ${resolveCompleteCall || 'N/A'}. Notes: ${resolveCompleteNotes || 'None'}`;
        workItemUpdate.status = 'Closed';
        break;
      case 're-index':
        noteText = `Work Item Re-Indexed. Option: ${reindexOption}. Reason: ${reindexReason || 'N/A'}. Copy notes: ${reindexCopyNotes}. Notes: ${reindexNotes || 'None'}`;
        // Note: Actual re-indexing logic would be more complex and is not fully implemented here.
        // This just logs the intent. We can mark it as pending review.
        workItemUpdate.status = 'Pending';
        break;
      case 'terminate':
        noteText = `Work Item Terminated. Reason: ${terminateReason || 'N/A'}. Notes: ${terminateNotes || 'None'}`;
        workItemUpdate.status = 'Closed';
        break;
      case 'resolve-close':
        noteText = `Work Item Resolved/Closed. Customer request resolved: ${resolveCloseResolved || 'N/A'}. Notes: ${resolveCloseNotes || 'None'}`;
        workItemUpdate.status = 'Closed';
        break;
      case 'transfer':
        const targetUser = users?.find(u => u.uid === transferToUser);
        noteText = `Work Item Transferred to ${targetUser?.displayName || 'Unknown User'}. Notes: ${transferNotes || 'None'}`;
        workItemUpdate.assignedTo = transferToUser;
        break;
      case 'pend':
        const pendDateFormatted = pendUntilDate ? format(pendUntilDate, 'yyyy-MM-dd') : 'N/A';
        noteText = `Work Item Pended until ${pendDateFormatted}. Reason: ${pendReason || 'N/A'}. Notes: ${pendNotes || 'None'}`;
        workItemUpdate.status = 'Pending';
        // You might want to store the pendUntilDate on the workItem as well.
        break;
      default:
        return;
    }
    
    // 1. Add the note
    addDocumentNonBlocking(notesCollectionRef, {
      authorId: user.uid,
      author: user.displayName || user.email || 'System',
      text: noteText,
      createdAt: new Date().toISOString(),
      workItemId: workItem.id,
    });
    
    // 2. Update the work item
    updateDocumentNonBlocking(workItemRef, workItemUpdate);

    toast({
      title: "Action Submitted",
      description: `The action '${selectedAction}' was successfully logged and applied.`,
    });

    onCancel(); // Hide form after submission
  };

  const renderActionForm = () => {
    switch (selectedAction) {
      case 'resolve-complete':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-bold">Call to customer?</Label>
              <Select onValueChange={setResolveCompleteCall} value={resolveCompleteCall}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold" htmlFor="notes-resolve-complete">Notes</Label>
              <Textarea id="notes-resolve-complete" placeholder="Add notes..." value={resolveCompleteNotes} onChange={e => setResolveCompleteNotes(e.target.value)} />
            </div>
          </div>
        );
      case 're-index':
        return (
          <div className="space-y-4">
             <div className="space-y-2">
              <Label className="font-bold">Please select the correct Re-index option</Label>
              <RadioGroup value={reindexOption} onValueChange={setReindexOption}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="myself" id="reindex-myself" />
                  <Label htmlFor="reindex-myself">Re-index case myself</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="initial" id="reindex-initial" />
                  <Label htmlFor="reindex-initial">Return to initial Indexing</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Reason</Label>
              <Select onValueChange={setReindexReason} value={reindexReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Wrong Process">Wrong Process</SelectItem>
                  <SelectItem value="Incorrect Data">Incorrect Data</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
                <Label className="font-bold">Do you want to copy the notes to the new case?</Label>
                 <RadioGroup value={reindexCopyNotes} onValueChange={setReindexCopyNotes}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="copy-yes" />
                        <Label htmlFor="copy-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="copy-no" />
                        <Label htmlFor="copy-no">No</Label>
                    </div>
                </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label className="font-bold" htmlFor="notes-re-index">Note</Label>
              <Textarea id="notes-re-index" placeholder="Add notes..." value={reindexNotes} onChange={e => setReindexNotes(e.target.value)} />
            </div>
          </div>
        );
      case 'terminate':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-bold">Reason</Label>
              <Select onValueChange={setTerminateReason} value={terminateReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Customer Request">Customer Request</SelectItem>
                  <SelectItem value="Potential Fraud">Potential Fraud</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold" htmlFor="notes-terminate">Notes</Label>
              <Textarea id="notes-terminate" placeholder="Add notes..." value={terminateNotes} onChange={e => setTerminateNotes(e.target.value)} />
            </div>
          </div>
        );
      case 'resolve-close':
         return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-bold">Customer request resolved?</Label>
              <Select onValueChange={setResolveCloseResolved} value={resolveCloseResolved}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold" htmlFor="notes-resolve-close">Notes</Label>
              <Textarea id="notes-resolve-close" placeholder="Add notes..." value={resolveCloseNotes} onChange={e => setResolveCloseNotes(e.target.value)} />
            </div>
          </div>
        );
      case 'transfer':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-bold">Transfer to User</Label>
              <Select onValueChange={setTransferToUser} value={transferToUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                   {users?.map(user => (
                    <SelectItem key={user.uid} value={user.uid}>{user.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold" htmlFor="notes-transfer">Notes</Label>
              <Textarea id="notes-transfer" placeholder="Add notes..." value={transferNotes} onChange={e => setTransferNotes(e.target.value)} />
            </div>
          </div>
        );
      case 'pend':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
                <Label className="font-bold">Pend until date</Label>
                <CustomCalendar value={pendUntilDate} onChange={setPendUntilDate} />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Reason for pend</Label>
              <Select onValueChange={setPendReason} value={pendReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Information Needed">Information Needed</SelectItem>
                  <SelectItem value="Customer Unavailable">Customer Unavailable</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold" htmlFor="notes-pend">Notes</Label>
              <Textarea id="notes-pend" placeholder="Add notes..." value={pendNotes} onChange={e => setPendNotes(e.target.value)} />
            </div>
          </div>
        );
      default:
        return <p className='text-center text-muted-foreground'>Please select an action to continue.</p>;
    }
  };

  return (
    <Card className="my-4 border-primary border-2">
      <CardHeader>
        <CardTitle>Verify Customer Authority - Action</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold">Action</Label>
              <Select onValueChange={(value) => setSelectedAction(value as string)}>
                <SelectTrigger>
                  <SelectValue placeholder="--Select a different action--" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resolve-complete">Resolve Complete</SelectItem>
                  <SelectItem value="re-index">Re-Index</SelectItem>
                  <SelectItem value="terminate">Terminate</SelectItem>
                  <SelectItem value="resolve-close">Resolve Close</SelectItem>
                  <SelectItem value="transfer">Transfer to Another User</SelectItem>
                  <SelectItem value="pend">Pend Work</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedAction && <Separator className='my-4' />}

            {renderActionForm()}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedAction}>Submit</Button>
          </div>
        </form>
      </CardContent>
    </Card>
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

    const closingUserRef = useMemoFirebase(() => {
        if (!firestore || !lastNote?.authorId) return null;
        return doc(firestore, 'users', lastNote.authorId);
    }, [firestore, lastNote?.authorId]);

    const { data: closingUser } = useDoc<User>(closingUserRef);

    return (
        <div className="flex items-center gap-4 text-sm py-2">
            <Lock className="h-5 w-5 text-destructive" />
            <span className="font-medium">Work Item {workItem.status}:</span>
            <span className="text-muted-foreground">
                Action by {closingUser?.displayName || lastNote?.author || 'System'}
            </span>
            <Separator orientation="vertical" className="h-5" />
            <span className="text-sm text-muted-foreground">{lastNote?.text}</span>
        </div>
    );
}

export function WorkItemView({ workItemId, customId }: { workItemId: string, customId: string }) {
  const { firestore } = useFirebase();
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

  const { data: assignedUser, isLoading: isUserLoading } = useDoc<User>(assignedUserRef);

  const isLoading = isWorkItemLoading || isUserLoading;

  const priorityMap: { [key in WorkItem['urgency']]: number } = {
    High: 1,
    Medium: 5,
    Low: 10,
  };


  if (isLoading || !item) {
    return (
       <div className="flex h-full w-full items-center justify-center p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  const PlaceholderContent = ({ title }: { title: string }) => (
    <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 p-6">
      <p className="text-muted-foreground">{title} (Not Implemented)</p>
    </div>
  );

  const isClosed = item.status === 'Closed';

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
            <span>Priority: <span className="text-muted-foreground">{priorityMap[item.urgency]}</span></span>
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

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
         <div className="mb-4 space-y-2">
            <h2 className="text-lg font-semibold">Processes</h2>
            <Separator />
             {isVerifyingAuthority ? (
              <VerifyAuthorityForm workItem={item} onCancel={() => setIsVerifyingAuthority(false)} />
            ) : isClosed ? (
              <ClosedWorkItemInfo workItem={item} />
            ) : (
              <div className="flex items-center gap-4 text-sm py-2">
                  <span className="font-medium">Assigned To:</span>
                  <span>{assignedUser?.displayName || '...'}</span>
                  <Button onClick={() => setIsVerifyingAuthority(true)} className="h-7 text-xs bg-black text-white hover:bg-black/80">
                    Verify Customer Authority
                  </Button>
              </div>
            )}
         </div>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="h-auto rounded-none bg-transparent p-0 flex">
            <TabsTrigger value="overview" className="relative flex-1 justify-center h-7 rounded-none border-b-2 border-transparent bg-[#A60A0A] px-1 text-xs text-white transition-none hover:bg-[#A60A0A]/80 data-[state=active]:border-transparent data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none">Work Overview</TabsTrigger>
            <TabsTrigger value="notes" className="relative flex-1 justify-center h-7 rounded-none border-b-2 border-transparent bg-[#A60A0A] px-1 text-xs text-white transition-none hover:bg-[#A60A0A]/80 data-[state=active]:border-transparent data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none">Notes</TabsTrigger>
            <TabsTrigger value="contact" className="relative flex-1 justify-center h-7 rounded-none border-b-2 border-transparent bg-[#A60A0A] px-1 text-xs text-white transition-none hover:bg-[#A60A0A]/80 data-[state=active]:border-transparent data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none">Contact Info</TabsTrigger>
            <TabsTrigger value="images" className="relative flex-1 justify-center h-7 rounded-none border-b-2 border-transparent bg-[#A60A0A] px-1 text-xs text-white transition-none hover:bg-[#A60A0A]/80 data-[state=active]:border-transparent data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none">Images</TabsTrigger>
            <TabsTrigger value="associations" className="relative flex-1 justify-center h-7 rounded-none border-b-2 border-transparent bg-[#A60A0A] px-1 text-xs text-white transition-none hover:bg-[#A60A0A]/80 data-[state=active]:border-transparent data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none">Associations</TabsTrigger>
            <TabsTrigger value="tasks" className="relative flex-1 justify-center h-7 rounded-none border-b-2 border-transparent bg-[#A60A0A] px-1 text-xs text-white transition-none hover:bg-[#A60A0A]/80 data-[state=active]:border-transparent data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none">Tasks</TabsTrigger>
            <TabsTrigger value="policy" className="relative flex-1 justify-center h-7 rounded-none border-b-2 border-transparent bg-[#A60A0A] px-1 text-xs text-white transition-none hover:bg-[#A60A0A]/80 data-[state=active]:border-transparent data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none">Policy</TabsTrigger>
            <TabsTrigger value="agency" className="relative flex-1 justify-center h-7 rounded-none border-b-2 border-transparent bg-[#A60A0A] px-1 text-xs text-white transition-none hover:bg-[#A60A0A]/80 data-[state=active]:border-transparent data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none">Agency</TabsTrigger>
          </TabsList>
          
          <div className="mt-0 bg-card px-2">
            <TabsContent value="overview" className="mt-0">
              <Card className="border-0 shadow-none">
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">{item.overview}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-0">
              <NotesTab workItemId={item.id} />
            </TabsContent>

            <TabsContent value="contact" className="mt-0">
              <Card className="border-0 shadow-none">
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                      <UserIcon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Name:</span>
                      <span>{item.relatedContact.name}</span>
                  </div>
                   {item.relatedContact.address && (
                    <div className="flex items-start gap-4">
                        <Home className="h-5 w-5 text-muted-foreground mt-1" />
                        <div className="flex flex-col">
                           <span className="font-medium">Address:</span>
                           <span className="text-muted-foreground">{item.relatedContact.address}</span>
                        </div>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Email:</span>
                      <a href={`mailto:${item.relatedContact.email}`} className="text-primary hover:underline">{item.relatedContact.email}</a>
                  </div>
                  <div className="flex items-center gap-4">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Phone:</span>
                      <span>{item.relatedContact.phone}</span>
                  </div>
                  {item.relatedContact.phoneSecondary && (
                    <div className="flex items-center gap-4">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">Secondary Phone:</span>
                        <span>{item.relatedContact.phoneSecondary}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks" className="mt-0">
              <TasksTab tasks={item.tasks} />
            </TabsContent>

            <TabsContent value="images" className="mt-0">
              <PlaceholderContent title="Images" />
            </TabsContent>
            <TabsContent value="associations" className="mt-0">
              <PlaceholderContent title="Associations" />
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

    