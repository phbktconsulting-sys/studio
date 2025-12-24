

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
import { Briefcase, Mail, Phone, User as UserIcon, FilePenLine, RefreshCw, Paperclip, MoreVertical, Lock, Home, History, CalendarIcon, MessageSquare, Clock, ChevronsUpDown, X } from 'lucide-react';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CustomCalendar } from './custom-calendar';
import { useToast } from '@/hooks/use-toast';
import { NotesTab } from './notes-tab';
import { createWorkItem } from '@/ai/flows/create-work-item-flow';
import { useTabs } from '@/contexts/tab-context';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

const processTaskMap: Record<string, string[]> = {
    "New Business Request": ["Request Inmation & Quotation", "Request Website Development", "Request Mobile App Development", "Request Digital Marketing", "Request Meeting/Consultation", "Request Backend Support", "Request Graphic Design", "Request SEO Services", "Request Product Demo", "Request Project Proposal", "Request Maintenance Contract (AMC)", "Request Domain & Hosting", "Request Content Writing", "Request E-commerce Solution", "Request Automation & Micros", "Request Custom Software", "Request Urgent Repair (New Client)", "Request Callback", "Request Other Services"],
    "Development Services (Web & App)": ["New Corporate Website Build", "New E-Commerce Store Build", "Android App Development", "IOS App Development", "Hybrid App Development", "Excel Automation Micros", "CRM / ERP System Development", "Landing Page Creation", "Website Redesign Project", "Payment Gateway Integration", "API Development & Integration", "Admin Panel / Dashboard Build", "User Portal Development", "Chatbot Integration", "SaaS Platform Development", "Plugin / Extension Development", "UI/UX Design Mockups", "Database Structure Design", "Third-Party Tool Integration", "Website Speed Optimization"],
    "Operations & Support (Backend)": ["Server Down / Critical Issue", "Database Connection Error", "Fix Application Bug", "Restore Data form Backup", "Install SSL Certificate", "Migrate Server to Cloud", "Optimize Server Speed", "Update Security Patches", "Configure Firewalls", "Fix Email/SMTP Issues", "Resolve API Failure", "Clean Malware / Virus", "Update PHP/Node Version", "Manage User Permissions", "Setup Cron Jobs", "Review Error Logs", "DNS / Domain Configuration", "Hosting CPanel Support", "Automation Script Failure", "General Maintenance Task"],
    "Digital Services Request": ["Start SEO Campaign", "Start Google Ads (PPC)", "Start Facebook/Insta Ads", "Create Social Media Calendar", "Write Blog Content", "Design Marketing Graphics", "Setup Email Newsletter", "Create Promotional Video", "Manage LinkedIn Profile", "Setup Google Analytics", "Optimize Google My Business", "Manage Online Reviews", "Create Landing Page Copy", "Influencer Marketing Setup", "App Store Optimization (ASO)", "YouTube Channel Management", "Brand Identity Design", "Competitor Analysis Report", "Monthly Performance Report"],
    "Feedback / Complaint": ["Report a System Crash", "Report Slow Performance", "Report Login Issue", "Report Data Error", "Report UI/Design Flaw", "Complaint about Billing", "Complaint about Delay", "Complaint about Support Quality", "Complaint about Communication", "Suggest New Feature", "Suggest Design Change", "Suggest Process Improvement", "Escalation to Management", "Review: Positive Feedback", "Review: Negative Feedback", "Request for Refund", "Request for Contract Cancellation", "Report Security Concern", "Post-Project Feedback", "General Complaint"],
    "Other Service Request": ["Inquire about Invoice", "Inquire about Job Opening", "Inquire about Internship", "Inquire about Training", "Renew Domain Name", "Renew Hosting Plan", "Purchase Software License", "Update Company Details", "Request Tax Document", "Schedule Annual Review", "Vendor Sales Pitch", "Legal / Compliance Query", "Media / Press Inquiry", "Sponsorship Request", "Employee Referral", "Internal Admin Task", "Hardware Requirement", "Network Setup Request", "Office Visit Request", "Unclassified Request"]
};

const processTypes = Object.keys(processTaskMap);

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
  const [allTasksCompleted, setAllTasksCompleted] = useState<'yes' | 'no' | undefined>();


  const [reindexToProcess, setReindexToProcess] = useState('');
  const [reindexReason, setReindexReason] = useState('Wrong Process');
  const [reindexNotes, setReindexNotes] = useState('');
  const [shouldCopyNotes, setShouldCopyNotes] = useState<'yes' | 'no'>('yes');
  const [reindexOption, setReindexOption] = useState<'myself' | 'initial'>('myself');


  const [terminateReason, setTerminateReason] = useState('');
  const [terminateNotes, setTerminateNotes] = useState('');
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
        'transfer': 'TRANSFER',
        'pend': 'PEND'
    };
    return actionMap[actionValue] || 'VERIFY CUSTOMER AUTHORITY';
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore || !selectedAction) return;

    const workItemRef = doc(firestore, 'work_items', workItem.id);
    
    let noteText = '';
    let category = '';
    let workItemUpdate: Partial<WorkItem> & { [key: string]: any } = { 
        updatedAt: new Date().toISOString(),
        lockInfo: null // Unlock on any submission
    };
    let subjectForNote = getActionDisplayName(selectedAction).replace(/\s+/g, ' ').trim();

    try {
        switch(selectedAction) {
        case 'resolve-complete': {
            if (allTasksCompleted !== 'yes') {
              toast({ variant: 'destructive', title: 'Action Required', description: 'You must confirm all tasks are completed before resolving.' });
              return;
            }
            const completedTasks = workItem.tasks.map(task => ({
              ...task,
              completed: true,
              completedBy: task.completed ? task.completedBy : user.uid,
              completedAt: task.completed ? task.completedAt : new Date().toISOString(),
            }));

            category = 'Resolved/Completed';
            noteText = `Work item resolved. ${resolveCompleteNotes}`;
            workItemUpdate.status = 'Closed';
            workItemUpdate.lockInfo = null;
            workItemUpdate.tasks = completedTasks;
            break;
        }
        case 're-index': {
             if (reindexOption === 'return') {
                 toast({ title: "Action Noted", description: "Returning to initial indexing is not yet implemented, but your selection has been noted." });
                 onCancel();
                 return;
             }
             if (!reindexReason) {
                 toast({ variant: 'destructive', title: 'Error', description: 'Please select a reason for re-indexing.' });
                 return;
             }
            
            const reindexPayload = {
              process: 'Request Information', // Defaulting for "Re-index case myself"
              urgency: workItem.urgency,
              assignedTo: user.uid,
              createdBy: user.uid,
              relatedContact: workItem.relatedContact,
              overview: `Re-indexed from ${workItem.customId}. Original overview: ${workItem.overview}`,
              tasks: [],
              sourceWorkItemId: shouldCopyNotes === 'yes' ? workItem.id : undefined,
              reindexReason: reindexReason, 
              reindexNote: `Original Case ID: ${workItem.customId}. ${reindexNotes}`,
            };
            
            const newWorkItemResult = await createWorkItem(reindexPayload);
            if (!newWorkItemResult.id || !newWorkItemResult.customId) {
                throw new Error(newWorkItemResult.error || 'Failed to create new work item during re-index.');
            }
            
            const oldItemNoteText = `Case re-indexed to new Process '${reindexPayload.process}'. New Case ID: ${newWorkItemResult.customId}. Reason: ${reindexReason}. ${reindexNotes}`;
            workItemUpdate.status = 'Re-indexed';
            workItemUpdate.lockInfo = null;

             addDocumentNonBlocking(collection(firestore, `work_items/${workItem.id}/notes`), {
                authorId: user.uid,
                author: user.displayName || user.email,
                text: oldItemNoteText,
                createdAt: new Date().toISOString(),
                workItemId: workItem.id,
                category: 'Re-Indexed',
                subject: 'RE-INDEX',
            });

            toast({
                title: 'Work Item Re-Indexed',
                description: `Successfully created new work item ${newWorkItemResult.customId}.`,
            });
            openTab({ id: newWorkItemResult.id, title: newWorkItemResult.customId, type: 'work-item' });
            
            updateDocumentNonBlocking(workItemRef, workItemUpdate);
            onCancel(); 
            return;
        }
        case 'terminate':
            category = 'Terminated';
            noteText = `Reason: ${terminateReason}. ${terminateNotes}`;
            workItemUpdate.status = 'Closed';
            workItemUpdate.lockInfo = null;
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

        addDocumentNonBlocking(collection(firestore, `work_items/${workItem.id}/notes`), {
          authorId: user.uid,
          author: user.displayName || user.email,
          text: noteText,
          createdAt: new Date().toISOString(),
          workItemId: workItem.id,
          category,
          subject: subjectForNote,
        });
        
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
      case 'resolve-complete':
        return (
          <div className="grid grid-cols-2 gap-x-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">All Tasks Completed?</Label>
                <RadioGroup
                  value={allTasksCompleted}
                  onValueChange={(value) => setAllTasksCompleted(value as 'yes' | 'no')}
                  className="flex items-center space-x-4 pt-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="tasks-yes" />
                    <Label htmlFor="tasks-yes" className="font-normal text-xs">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="tasks-no" />
                    <Label htmlFor="tasks-no" className="font-normal text-xs">No</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Tasks</Label>
                <div className="mt-1 space-y-2 rounded-md border p-2 h-28 overflow-y-auto">
                    {(workItem.tasks || []).map(task => (
                    <div key={task.id} className="flex items-center text-xs">
                        <Checkbox id={`task-display-${task.id}`} checked={task.completed} disabled className="mr-2" />
                        <label htmlFor={`task-display-${task.id}`} className={cn("flex-1", task.completed && "line-through text-muted-foreground")}>
                        {task.text}
                        </label>
                    </div>
                    ))}
                    {(workItem.tasks || []).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">No tasks assigned.</p>
                    )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
                <Label className="text-xs font-semibold" htmlFor="notes-resolve-complete">Notes</Label>
                <Textarea
                    id="notes-resolve-complete"
                    placeholder="Add final notes..."
                    value={resolveCompleteNotes}
                    onChange={e => setResolveCompleteNotes(e.target.value)}
                    className="text-xs min-h-[100px] mt-1"
                />
            </div>
          </div>
        );
      case 're-index':
        return (
          <div className="grid grid-cols-2 gap-x-8 text-xs">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label className="font-semibold whitespace-nowrap">Please select the correct Re-index option<span className="text-destructive">*</span></Label>
                  <RadioGroup value={reindexOption} onValueChange={(v) => setReindexOption(v as 'myself' | 'initial')} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="myself" id="reindex-myself" />
                      <Label htmlFor="reindex-myself" className="font-normal h-8 flex items-center">Re-index case myself</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="initial" id="reindex-initial" />
                      <Label htmlFor="reindex-initial" className="font-normal h-8 flex items-center">Return to initial Indexing</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="flex items-center gap-4">
                  <Label className="font-semibold whitespace-nowrap">Reason<span className="text-destructive">*</span></Label>
                  <Select onValueChange={setReindexReason} value={reindexReason}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Wrong Process">Wrong Process</SelectItem>
                      <SelectItem value="Incorrect Category Selected">Incorrect Category Selected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-4">
                  <Label className="font-semibold whitespace-nowrap">Do you want to copy the notes to the new case?</Label>
                   <RadioGroup value={shouldCopyNotes} onValueChange={(v) => setShouldCopyNotes(v as 'yes' | 'no')} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="copy-yes" />
                      <Label htmlFor="copy-yes" className="font-normal h-8 flex items-center">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="copy-no" />
                      <Label htmlFor="copy-no" className="font-normal h-8 flex items-center">No</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="font-semibold" htmlFor="notes-re-index">Note<span className="text-destructive">*</span></Label>
                <Textarea id="notes-re-index" placeholder="Add notes..." value={reindexNotes} onChange={e => setReindexNotes(e.target.value)} className="text-xs min-h-[100px]" />
              </div>
            </div>
        );
      case 'terminate':
        return (
          <div className="grid grid-cols-2 gap-x-8">
            <div className="space-y-2">
                <Label className="text-xs font-semibold">Reason</Label>
                <Select onValueChange={setTerminateReason} value={terminateReason}>
                <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Duplicate Work Item">Duplicate Work Item</SelectItem>
                    <SelectItem value="Already Processed in Another Work Item">Already Processed in Another Work Item</SelectItem>
                    <SelectItem value="Previously Resolved">Previously Resolved</SelectItem>
                    <SelectItem value="Superseded by Newer Request">Superseded by Newer Request</SelectItem>
                    <SelectItem value="Handled Offline / Verbally">Handled Offline / Verbally</SelectItem>
                    <SelectItem value="Invalid Entry / Test Data">Invalid Entry / Test Data</SelectItem>
                    <SelectItem value="Accidental Creation">Accidental Creation</SelectItem>
                    <SelectItem value="Request No Longer Needed">Request No Longer Needed</SelectItem>
                    <SelectItem value="Out of Service Scope">Out of Service Scope</SelectItem>
                    <SelectItem value="System Auto-Generated Error">System Auto-Generated Error</SelectItem>
                    <SelectItem value="Information Insufficient to Process">Information Insufficient to Process</SelectItem>
                    <SelectItem value="Internal Decision no Longer Require">Internal Decision no Longer Require</SelectItem>
                </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label className="text-xs font-semibold" htmlFor="notes-terminate">Notes</Label>
                <Textarea id="notes-terminate" placeholder="Add notes..." value={terminateNotes} onChange={e => setTerminateNotes(e.target.value)} className="text-xs min-h-[100px]" />
            </div>
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
          <div className="grid grid-cols-2 gap-x-8">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Transfer to User</Label>
              <Select onValueChange={setTransferToUser} value={transferToUser}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.uid} value={user.uid}>{user.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold" htmlFor="notes-transfer">Notes</Label>
              <Textarea id="notes-transfer" placeholder="Add notes..." value={transferNotes} onChange={e => setTransferNotes(e.target.value)} className="text-xs min-h-[100px]" />
            </div>
          </div>
        );
      case 'pend':
        return (
          <div className="grid grid-cols-3 gap-x-8">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-xs font-semibold">Pend until date</Label>
                    <CustomCalendar value={pendUntilDate} onChange={setPendUntilDate} />
                </div>
              </div>
            <div className="space-y-2">
                <Label className="text-xs font-semibold">Reason for pend</Label>
                <Select onValueChange={setPendReason} value={pendReason}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending Internal Action">Pending Internal Action</SelectItem>
                    <SelectItem value="Awaiting Other Team Response">Awaiting Other Team Response</SelectItem>
                    <SelectItem value="Awaiting Client Feedback">Awaiting Client Feedback</SelectItem>
                    <SelectItem value="Blocked by Another Task">Blocked by Another Task</SelectItem>
                    <SelectItem value="Pending Final Review">Pending Final Review</SelectItem>
                    <SelectItem value="Scheduled for Later">Scheduled for Later</SelectItem>
                    <SelectItem value="Under Technical Investigation">Under Technical Investigation</SelectItem>
                    <SelectItem value="Clarification Needed">Clarification Needed</SelectItem>
                    <SelectItem value="On Hold by Request">On Hold by Request</SelectItem>
                    <SelectItem value="Awaiting Developer Action">Awaiting Developer Action</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label className="text-xs font-semibold" htmlFor="notes-pend">Notes</Label>
                <Textarea id="notes-pend" placeholder="Add notes..." value={pendNotes} onChange={e => setPendNotes(e.target.value)} className="text-xs min-h-[100px]" />
             </div>
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
      { value: 'transfer', label: 'Transfer', adminOnly: true },
      { value: 'pend', label: 'Pend' }
  ];
  
  const availableActions = actionOptions.filter(opt => !(opt.adminOnly && role !== 'Admin'));


  return (
    <form onSubmit={handleSubmit}>
      <Card className="mt-4 border-primary border">
        <CardHeader className="p-2 bg-slate-100 flex-row items-center gap-4 rounded-t-lg">
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
        <div className="flex justify-center gap-2 mt-4">
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

function ClosedWorkItemInfo({ workItem, lastNote }: { workItem: WorkItem; lastNote: Note | undefined; }) {
    const { firestore } = useFirebase();

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

function PendingWorkItemInfo({ workItemId, note }: { workItemId: string, note: Note | undefined }) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const handleResume = () => {
    if (!firestore || !user) return;
    const workItemRef = doc(firestore, 'work_items', workItemId);
    const notesRef = collection(firestore, `work_items/${workItemId}/notes`);

    updateDocumentNonBlocking(workItemRef, {
      status: 'Open',
      updatedAt: new Date().toISOString(),
    });

    addDocumentNonBlocking(notesRef, {
      authorId: user.uid,
      author: user.displayName,
      text: 'Work resumed from pending status.',
      createdAt: new Date().toISOString(),
      workItemId: workItemId,
      category: 'Status Change',
      subject: 'Work Resumed',
    });

    toast({
      title: 'Work Resumed',
      description: 'The work item status has been set to "Open".',
    });
  };

  const reason = note?.text.match(/Reason: (.*?)\./)?.[1] || 'Not specified';
  const untilDate = note?.text.match(/Pend until: (.*?)\./)?.[1] || 'N/A';

  return (
    <div className="flex items-center justify-between gap-4 text-xs py-2">
        <div className="flex items-center gap-4">
            <Clock className="h-5 w-5 text-orange-500" />
            <span className="font-medium">Case Pended until {untilDate}:</span>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-muted-foreground">{reason}</span>
        </div>
        <Button onClick={handleResume} size="sm" className="h-7 text-xs">Resume Work</Button>
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
  const isPended = item.status === 'Pending';
  const isLockedByOther = item.lockInfo && item.lockInfo.userId !== currentUser?.uid;
  
  const lastPendedNote = isPended ? latestNoteArr?.find(n => n.category === 'Pended') : undefined;

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
                <ClosedWorkItemInfo workItem={item} lastNote={latestNote} />
            ) : isPended ? (
                <PendingWorkItemInfo workItemId={item.id} note={lastPendedNote} />
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
