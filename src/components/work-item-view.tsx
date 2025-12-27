

'use client';

import { useMemo, useState, useEffect } from 'react';
import type { Note, Task, WorkItem, User, WorkItemFormValues, ImageAttachment, ContactInfoUpdateValues } from '@/lib/types';
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
import { Button, buttonVariants } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Briefcase, Mail, Phone, User as UserIcon, FilePenLine, RefreshCw, Paperclip, MoreVertical, Lock, Home, History, CalendarIcon, MessageSquare, Clock, ChevronsUpDown, X, Check, Download, Pencil, Building2, TrendingUp, Handshake, Fingerprint, Banknote } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useFirebase, useDoc, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useUser } from '@/firebase';
import { collection, doc, query, orderBy, limit, where, getDocs, updateDoc } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from './ui/label';
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
import { ImageAttachmentDialog } from './image-attachment-dialog';
import { EditContactInfoDialog } from './edit-contact-info-dialog';
import { QuotationTab } from './quotation-tab';
import { QuotationPrintTemplate } from '@/components/quotation-tab';
import { createRoot } from 'react-dom/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const processTaskMap: Record<string, string[]> = {
    "New Business Request": ["Request Inmation & Quotation", "Request Website Development", "Request Mobile App Development", "Request Digital Marketing", "Request Meeting/Consultation", "Request Backend Support", "Request Graphic Design", "Request SEO Services", "Request Product Demo", "Request Project Proposal", "Request Maintenance Contract (AMC)", "Request Domain & Hosting", "Request Content Writing", "Request E-commerce Solution", "Request Automation & Micros", "Request Custom Software", "Request Urgent Repair (New Client)", "Request Callback", "Request Call for New Lead", "Request Other Services"],
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

      const userIds = [...new Set([
          ...tasks.map(task => task.createdBy).filter(Boolean),
          ...tasks.map(task => task.completedBy).filter(Boolean)
      ])] as string[];
      
      const idsToFetch = userIds.filter(id => !usersMap.has(id));
      
      if (idsToFetch.length === 0) return;

      const newUsersMap = new Map<string, string>(usersMap);
      
      const chunks = [];
      for (let i = 0; i < idsToFetch.length; i += 30) {
          chunks.push(idsToFetch.slice(i, i + 30));
      }

      try {
        const usersRef = collection(firestore, 'users');
        for (const chunk of chunks) {
          const q = query(usersRef, where('uid', 'in', chunk));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            const userData = doc.data() as User;
            newUsersMap.set(userData.uid, userData.displayName || 'Unknown User');
          });
        }
        setUsersMap(newUsersMap);
      } catch (error) {
        console.warn("Could not fetch user profiles for tasks:", error);
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
    if (!firestore) return;
    const workItemRef = doc(firestore, 'work_items', workItemId);
    const currentTasks = tasks || [];
    const updatedTasks = currentTasks.map(task =>
      task.id === taskId ? { ...task, completed } : task
    );
    updateDocumentNonBlocking(workItemRef, { tasks: updatedTasks });
  };

  if (!tasks || tasks.length === 0) {
    return <p className="p-4 text-xs text-muted-foreground">No tasks for this work item.</p>;
  }

  return (
    <div className="space-y-4 p-4">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-center justify-between rounded-md border p-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id={`task-${task.id}`}
              checked={task.completed}
              disabled
            />
            <label
                htmlFor={`task-${task.id}`}
                className={`text-xs font-medium leading-none ${task.completed ? 'line-through text-muted-foreground' : ''}`}
            >
                {task.text}
            </label>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            {task.completed && task.completedBy ? (
              <>
                <p>Completed by {usersMap.get(task.completedBy) || '...'}</p>
                <p>{task.completedAt ? format(parseISO(task.completedAt), 'MMM d, yyyy') : ''}</p>
              </>
            ) : task.createdBy ? (
              <>
                <p>Added by {usersMap.get(task.createdBy) || '...'}</p>
                <p>{task.createdAt ? format(parseISO(task.createdAt), 'MMM d, yyyy') : ''}</p>
              </>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function VerifyAuthorityForm({ workItem, onCancel }: { workItem: WorkItem; onCancel: () => void }) {
  const { firestore, user } = useFirebase();
  const { openTab } = useTabs();
  const { toast } = useToast();
  const { role } = useUser();
  const [selectedAction, setSelectedAction] = useState<string>('resolve-complete');
  
  // Form field states
  const [resolveCompleteNotes, setResolveCompleteNotes] = useState('');
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(() => new Set(workItem.tasks?.filter(t => t.completed).map(t => t.id) || []));
  const [allTasksCompleted, setAllTasksCompleted] = useState<'yes' | 'no' | undefined>();

  const [reindexReasonForReindex, setReindexReasonForReindex] = useState<string>('');
  const [reindexProcess, setReindexProcess] = useState<string>('');
  const [reindexTasks, setReindexTasks] = useState<string[]>([]);
  const [reindexNotes, setReindexNotes] = useState('');
  const [shouldCopyNotes, setShouldCopyNotes] = useState<'yes' | 'no'>('yes');
  const [reindexOption, setReindexOption] = useState<'myself' | 'initial'>('myself');
  
  const [cloneToProcess, setCloneToProcess] = useState('');
  const [cloneTasks, setCloneTasks] = useState<string[]>([]);
  const [cloneNotes, setCloneNotes] = useState('');
  const [cloneOption, setCloneOption] = useState<'myself' | 'initial'>('myself');


  const [terminateReason, setTerminateReason] = useState('');
  const [terminateNotes, setTerminateNotes] = useState('');
  const [transferToUser, setTransferToUser] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [pendUntilDate, setPendUntilDate] = useState<Date>();
  const [pendReason, setPendReason] = useState('');
  const [pendNotes, setPendNotes] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  

  useEffect(() => {
    async function fetchUsers() {
        if (!firestore || !user) return;
        setIsLoadingUsers(true);
        try {
            const usersCol = collection(firestore, 'users');
            const userSnapshot = await getDocs(usersCol);
            const userList = userSnapshot.docs
                .map(doc => doc.data() as User)
                .filter(u => u.uid !== user.uid); // Exclude current user
            setUsers(userList);
        } catch (error) {
            console.error("Failed to fetch users:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load users for transfer.' });
        } finally {
            setIsLoadingUsers(false);
        }
    }
    fetchUsers();
}, [firestore, user, toast]);
  
  const getActionDisplayName = (actionValue: string) => {
    if (!actionValue) return 'VERIFY CUSTOMER AUTHORITY';
    const actionMap: { [key: string]: string } = {
        'resolve-complete': 'RESOLVE COMPLETE',
        're-index': 'RE-INDEX',
        'clone': 'CLONE WORK ITEM',
        'terminate': 'TERMINATE',
        'transfer': 'TRANSFER',
        'pend': 'PEND'
    };
    return actionMap[actionValue] || 'VERIFY CUSTOMER AUTHORITY';
  }

  const handleTaskCompletionChange = (taskId: string, isCompleted: boolean) => {
    setCompletedTasks(prev => {
        const newSet = new Set(prev);
        if (isCompleted) {
            newSet.add(taskId);
        } else {
            newSet.delete(taskId);
        }
        return newSet;
    });
  };

  const renderActionForm = () => {
    switch (selectedAction) {
      case 'resolve-complete':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 items-start gap-2">
              <div className="col-span-1">
                <Label>Outstanding Tasks</Label>
                <p className="text-xs text-muted-foreground">Mark any completed tasks.</p>
              </div>
              <div className="col-span-2">
                <div className="space-y-2">
                  {workItem.tasks.length > 0 ? (
                    workItem.tasks.map(task => (
                      <div key={task.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`complete-${task.id}`}
                          checked={completedTasks.has(task.id)}
                          onCheckedChange={(checked) => handleTaskCompletionChange(task.id, !!checked)}
                        />
                        <label htmlFor={`complete-${task.id}`} className="text-xs">{task.text}</label>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No tasks for this work item.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 items-start gap-2">
              <div className="col-span-1">
                <Label>Confirm Task Completion</Label>
                <p className="text-xs text-muted-foreground">Have all tasks been finished?</p>
              </div>
              <div className="col-span-2">
                <RadioGroup
                  value={allTasksCompleted}
                  onValueChange={(v) => setAllTasksCompleted(v as 'yes' | 'no')}
                  className="flex flex-row space-x-4 text-xs h-7 items-center"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="tasks-yes" />
                    <Label htmlFor="tasks-yes" className="font-normal">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="tasks-no" />
                    <Label htmlFor="tasks-no" className="font-normal">No</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            <div className="grid grid-cols-3 items-start gap-2">
              <div className="col-span-1">
                <Label>Notes</Label>
                <p className="text-xs text-muted-foreground">Add resolution notes.</p>
              </div>
              <div className="col-span-2">
                <Textarea
                  value={resolveCompleteNotes}
                  onChange={(e) => setResolveCompleteNotes(e.target.value)}
                  placeholder="Add resolution notes..."
                  className="min-h-[80px] text-xs w-3/5"
                />
              </div>
            </div>
          </div>
        );
       case 're-index':
        const reindexReasonOptions = [
            "Incorrect Category Selected",
            "Assigned to Wrong Department",
            "Assigned to Wrong Person",
            "Escalation to Management",
            "Client Requested Delay",
            "Internal Request"
        ];
        return (
          <div className="space-y-4">
             <div className="grid grid-cols-3 items-center gap-2">
               <div className="col-span-1">
                 <Label>Please select the correct Re-index option*</Label>
               </div>
              <div className="col-span-2">
                <RadioGroup value={reindexOption} onValueChange={(v) => setReindexOption(v as 'myself' | 'initial')} className="flex h-7 items-center gap-4 text-xs">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="myself" id="reindex-myself" />
                        <Label htmlFor="reindex-myself" className="font-normal">Re-index case myself</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="initial" id="reindex-initial" />
                        <Label htmlFor="reindex-initial" className="font-normal">Return to initial Indexing</Label>
                    </div>
                </RadioGroup>
              </div>
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="col-span-1">Reason for Re-index*</Label>
              <div className="col-span-2">
                 <Select onValueChange={setReindexReasonForReindex} value={reindexReasonForReindex}>
                   <SelectTrigger className="h-7 text-xs w-2/5">
                     <SelectValue placeholder="Select a reason" />
                   </SelectTrigger>
                   <SelectContent>
                     {reindexReasonOptions.map((reason) => (
                        <SelectItem key={reason} value={reason} className="text-sm">
                          {reason}
                        </SelectItem>
                      ))}
                   </SelectContent>
                 </Select>
              </div>
           </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="col-span-1">Process*</Label>
              <div className="col-span-2">
                 <Select onValueChange={(value) => { setReindexProcess(value); setReindexTasks([]); }} value={reindexProcess}>
                   <SelectTrigger className="h-7 text-xs w-2/5">
                     <SelectValue placeholder="Select a new process" />
                   </SelectTrigger>
                   <SelectContent>
                     {processTypes.map((type) => (
                        <SelectItem key={type} value={type} className="text-sm">
                          {type}
                        </SelectItem>
                      ))}
                   </SelectContent>
                 </Select>
              </div>
           </div>
           
           {reindexProcess && (
             <div className="grid grid-cols-3 items-start gap-2">
                <Label className="col-span-1 self-start pt-1.5">Task</Label>
                <div className="col-span-2 flex flex-col gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            className={cn("w-full md:w-2/5 justify-between h-7 text-xs", !reindexTasks?.length && "text-muted-foreground")}
                        >
                            {reindexTasks?.length > 0 ? `${reindexTasks.length} tasks selected` : "Select initial tasks"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Search tasks..." />
                            <CommandList>
                            <CommandEmpty>No tasks found for this process.</CommandEmpty>
                            <CommandGroup>
                                {(processTaskMap[reindexProcess] || []).map((task) => (
                                    <CommandItem
                                        key={task}
                                        onSelect={() => {
                                            const isSelected = reindexTasks.includes(task);
                                            setReindexTasks(isSelected ? reindexTasks.filter(t => t !== task) : [...reindexTasks, task]);
                                        }}
                                    >
                                        <Checkbox checked={reindexTasks.includes(task)} className="mr-2" />
                                        {task}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                            </CommandList>
                        </Command>
                        </PopoverContent>
                    </Popover>
                    {reindexTasks.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                            {reindexTasks.map(task => (
                                <Badge key={task} variant="secondary" className="text-xs font-normal">
                                    {task}
                                    <button
                                        type="button"
                                        className="ml-1.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                                        onClick={() => setReindexTasks(prev => prev.filter(t => t !== task))}
                                    >
                                        <X className="h-3 w-3" />
                                        <span className="sr-only">Remove {task}</span>
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            </div>
           )}
            
             <div className="grid grid-cols-3 items-center gap-2">
                <Label className="col-span-1">Do you want to copy the notes to the new case?</Label>
                <div className="col-span-2">
                  <RadioGroup value={shouldCopyNotes} onValueChange={(v) => setShouldCopyNotes(v as 'yes' | 'no')} className="flex h-7 items-center gap-4 text-xs">
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="copy-yes" />
                          <Label htmlFor="copy-yes" className="font-normal">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="copy-no" />
                          <Label htmlFor="copy-no" className="font-normal">No</Label>
                      </div>
                  </RadioGroup>
                </div>
             </div>
            <div className="grid grid-cols-3 items-start gap-2">
               <Label className="col-span-1">Note*</Label>
              <div className="col-span-2">
                <Textarea
                    value={reindexNotes}
                    onChange={(e) => setReindexNotes(e.target.value)}
                    placeholder="Add re-indexing notes..."
                    className="min-h-[80px] text-xs w-3/5"
                    />
              </div>
            </div>
          </div>
        );
        case 'clone':
        return (
            <div className="space-y-4">
               <div className="grid grid-cols-3 items-center gap-2">
                  <div className="col-span-1">
                    <Label>New Process</Label>
                    <p className="text-xs text-muted-foreground">Select the process for the cloned item.</p>
                  </div>
                  <div className="col-span-2">
                    <Select onValueChange={(value) => { setCloneToProcess(value); setCloneTasks([]); }} value={cloneToProcess}>
                        <SelectTrigger className="h-7 text-xs w-2/5">
                            <SelectValue placeholder="Select Process for Cloned Item" />
                        </SelectTrigger>
                        <SelectContent>
                            {processTypes.map((type) => (
                                <SelectItem key={type} value={type} className="text-sm">{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </div>
               </div>
                {cloneToProcess && (
                    <div className="grid grid-cols-3 items-start gap-2">
                       <div className="col-span-1 self-start pt-1.5">
                         <Label>Initial Tasks</Label>
                         <p className="text-xs text-muted-foreground">Select tasks for the cloned case.</p>
                       </div>
                       <div className="col-span-2 flex flex-col gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                className={cn("w-full md:w-2/5 justify-between h-7 text-xs", !cloneTasks?.length && "text-muted-foreground")}
                            >
                                {cloneTasks?.length > 0 ? `${cloneTasks.length} tasks selected` : "Select initial tasks for cloned case"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Search tasks..." />
                                <CommandList>
                                <CommandEmpty>No tasks found.</CommandEmpty>
                                <CommandGroup>
                                    {(processTaskMap[cloneToProcess] || []).map((task) => (
                                        <CommandItem
                                            key={task}
                                            onSelect={() => {
                                                const isSelected = cloneTasks.includes(task);
                                                setCloneTasks(isSelected ? cloneTasks.filter(t => t !== task) : [...cloneTasks, task]);
                                            }}
                                        >
                                            <Checkbox checked={cloneTasks.includes(task)} className="mr-2" />
                                            {task}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                                </CommandList>
                            </Command>
                            </PopoverContent>
                        </Popover>
                        {cloneTasks.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                                {cloneTasks.map(task => (
                                    <Badge key={task} variant="secondary" className="text-xs font-normal">
                                        {task}
                                        <button
                                            type="button"
                                            className="ml-1.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                                            onClick={() => setCloneTasks(prev => prev.filter(t => t !== task))}
                                        >
                                            <X className="h-3 w-3" />
                                            <span className="sr-only">Remove {task}</span>
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                       </div>
                    </div>
                )}
                 <div className="grid grid-cols-3 items-center gap-2">
                    <div className="col-span-1">
                      <Label>Assignment</Label>
                      <p className="text-xs text-muted-foreground">Who should the cloned case be assigned to?</p>
                    </div>
                    <div className="col-span-2">
                      <RadioGroup value={cloneOption} onValueChange={(v) => setCloneOption(v as 'myself' | 'initial')} className="flex h-7 items-center gap-4 text-xs">
                          <div className="flex items-center space-x-2">
                              <RadioGroupItem value="myself" id="clone-myself" />
                              <Label htmlFor="clone-myself" className="font-normal">Assign to myself</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                              <RadioGroupItem value="initial" id="clone-initial" />
                              <Label htmlFor="clone-initial" className="font-normal">Return to initial Indexing</Label>
                          </div>
                      </RadioGroup>
                    </div>
                 </div>
                 <div className="grid grid-cols-3 items-start gap-2">
                    <div className="col-span-1">
                      <Label>Notes</Label>
                      <p className="text-xs text-muted-foreground">Provide a reason for cloning.</p>
                    </div>
                    <div className="col-span-2">
                      <Textarea
                          value={cloneNotes}
                          onChange={(e) => setCloneNotes(e.target.value)}
                          placeholder="Add cloning notes/reason..."
                          className="min-h-[80px] text-xs w-3/5"
                      />
                    </div>
                 </div>
            </div>
        );
      case 'terminate':
        return (
          <div className="space-y-4">
             <div className="grid grid-cols-3 items-center gap-2">
                <div className="col-span-1">
                  <Label>Reason</Label>
                  <p className="text-xs text-muted-foreground">Select a reason for termination.</p>
                </div>
                <div className="col-span-2">
                  <Select onValueChange={setTerminateReason} value={terminateReason}>
                      <SelectTrigger className="h-7 text-xs w-2/5">
                          <SelectValue placeholder="Select termination reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Duplicate Work Item" className="text-sm">Duplicate Work Item</SelectItem>
                        <SelectItem value="Already Processed in Another Item" className="text-sm">Already Processed in Another Item</SelectItem>
                        <SelectItem value="Previously Resolved" className="text-sm">Previously Resolved</SelectItem>
                        <SelectItem value="Accidental Creation" className="text-sm">Accidental Creation</SelectItem>
                        <SelectItem value="Request No Longer Needed" className="text-sm">Request No Longer Needed</SelectItem>
                        <SelectItem value="Internal Administrative Closure" className="text-sm">Internal Administrative Closure</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
             </div>
             <div className="grid grid-cols-3 items-start gap-2">
                <div className="col-span-1">
                  <Label>Notes</Label>
                  <p className="text-xs text-muted-foreground">Add termination notes.</p>
                </div>
                <div className="col-span-2">
                  <Textarea
                      value={terminateNotes}
                      onChange={(e) => setTerminateNotes(e.target.value)}
                      placeholder="Add termination notes..."
                      className="min-h-[80px] text-xs w-3/5"
                  />
                </div>
             </div>
          </div>
        );
      case 'transfer':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 items-center gap-2">
                <div className="col-span-1">
                  <Label>Transfer To</Label>
                  <p className="text-xs text-muted-foreground">Select a user to transfer the case to.</p>
                </div>
                <div className="col-span-2">
                  <Select onValueChange={setTransferToUser} value={transferToUser} disabled={isLoadingUsers}>
                  <SelectTrigger className="h-7 text-xs w-2/5">
                      <SelectValue placeholder={isLoadingUsers ? "Loading users..." : "Select user to transfer to"} />
                  </SelectTrigger>
                  <SelectContent>
                      {users.map(u => (
                      <SelectItem key={u.uid} value={u.uid} className="text-sm">{u.displayName}</SelectItem>
                      ))}
                  </SelectContent>
                  </Select>
                </div>
            </div>
            <div className="grid grid-cols-3 items-start gap-2">
                <div className="col-span-1">
                  <Label>Notes</Label>
                  <p className="text-xs text-muted-foreground">Provide a reason for the transfer.</p>
                </div>
                <div className="col-span-2">
                  <Textarea
                      value={transferNotes}
                      onChange={(e) => setTransferNotes(e.target.value)}
                      placeholder="Add transfer notes..."
                      className="min-h-[80px] text-xs w-3/5"
                  />
                </div>
            </div>
          </div>
        );
      case 'pend':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 items-center gap-2">
                <div className="col-span-1">
                  <Label>Reason</Label>
                  <p className="text-xs text-muted-foreground">Select a reason for pending the case.</p>
                </div>
                <div className="col-span-2">
                  <Select onValueChange={setPendReason} value={pendReason}>
                      <SelectTrigger className="h-7 text-xs w-2/5">
                          <SelectValue placeholder="Select pend reason" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Pending Internal Action" className="text-sm">Pending Internal Action</SelectItem>
                          <SelectItem value="Awaiting Other Team Response" className="text-sm">Awaiting Other Team Response</SelectItem>
                          <SelectItem value="Awaiting Client Feedback" className="text-sm">Awaiting Client Feedback</SelectItem>
                          <SelectItem value="Blocked by Another Task" className="text-sm">Blocked by Another Task</SelectItem>
                          <SelectItem value="Pending Final Review" className="text-sm">Pending Final Review</SelectItem>
                          <SelectItem value="Scheduled for Later" className="text-sm">Scheduled for Later</SelectItem>
                          <SelectItem value="Under Technical Investigation" className="text-sm">Under Technical Investigation</SelectItem>
                          <SelectItem value="Clarification Needed" className="text-sm">Clarification Needed</SelectItem>
                          <SelectItem value="On Hold by Request" className="text-sm">On Hold by Request</SelectItem>
                          <SelectItem value="Awaiting Developer Action" className="text-sm">Awaiting Developer Action</SelectItem>
                          <SelectItem value="Other Reason" className="text-sm">Other Reason</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
                <div className="col-span-1">
                  <Label>Pend Until</Label>
                  <p className="text-xs text-muted-foreground">Select a date to pend the case until.</p>
                </div>
                <div className="w-full">
                  <CustomCalendar value={pendUntilDate} onChange={setPendUntilDate} />
                </div>
            </div>
            <div className="grid grid-cols-3 items-start gap-2">
                <div className="col-span-1">
                  <Label>Notes</Label>
                  <p className="text-xs text-muted-foreground">Add any relevant notes.</p>
                </div>
                <div className="col-span-2">
                  <Textarea
                      value={pendNotes}
                      onChange={(e) => setPendNotes(e.target.value)}
                      placeholder="Add pend notes..."
                      className="min-h-[80px] text-xs w-3/5"
                  />
                </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

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
            if (allTasksCompleted === undefined) {
                toast({ variant: 'destructive', title: 'Error', description: 'Please confirm if all tasks are completed.' });
                return;
            }
            if (!resolveCompleteNotes) {
                toast({ variant: 'destructive', title: 'Error', description: 'Notes are required.' });
                return;
            }
            const finalTasks = workItem.tasks.map(task => ({
              ...task,
              completed: completedTasks.has(task.id),
              completedBy: completedTasks.has(task.id) && !task.completed ? user.uid : task.completedBy,
              completedAt: completedTasks.has(task.id) && !task.completed ? new Date().toISOString() : task.completedAt,
            }));

            category = 'Resolved/Completed';
            noteText = `Work item resolved. ${resolveCompleteNotes}`;
            workItemUpdate.status = 'Closed';
            workItemUpdate.lockInfo = null;
            workItemUpdate.tasks = finalTasks;
            break;
        }
       case 're-index': {
            if (!reindexNotes) {
                toast({ variant: 'destructive', title: 'Error', description: 'Note is required for re-indexing.' });
                return;
            }
            if (!reindexProcess) {
                toast({ variant: 'destructive', title: 'Error', description: 'Please select a new process for re-indexing.' });
                return;
            }
            if (!reindexReasonForReindex) {
              toast({ variant: 'destructive', title: 'Error', description: 'Reason for re-index is required.' });
              return;
            }

            const isAssigningToQueue = reindexOption === 'initial';
            const newProcess = reindexProcess;
            const assignedTo = isAssigningToQueue ? newProcess : user.uid;

            const reindexPayload = {
              process: newProcess,
              urgency: workItem.urgency,
              assignedTo: assignedTo,
              createdBy: user.uid,
              relatedContact: {
                ...workItem.relatedContact,
                address: workItem.relatedContact.address ? { ...workItem.relatedContact.address } : {
                    country: '', line1: '', line2: '', city: '', state: '', zipcode: ''
                },
              },
              overview: `Re-indexed from ${workItem.customId}. Original overview: ${workItem.overview}`,
              tasks: reindexTasks.map(taskText => ({ 
                    id: `task-${Date.now()}-${Math.random()}`, 
                    text: taskText, 
                    completed: false,
                    createdBy: user.uid,
                    createdAt: new Date().toISOString()
                })),
              sourceWorkItemId: shouldCopyNotes === 'yes' ? workItem.id : undefined,
              reindexReason: reindexReasonForReindex, 
              reindexNote: `Original Case ID: ${workItem.customId}. ${reindexNotes}`,
            };
            
            const newWorkItemResult = await createWorkItem(reindexPayload);
            if (!newWorkItemResult.id || !newWorkItemResult.customId) {
                throw new Error(newWorkItemResult.error || 'Failed to create new work item during re-index.');
            }
            
            workItemUpdate.status = 'Re-indexed';
            await updateDoc(workItemRef, workItemUpdate);
            
            addDocumentNonBlocking(collection(firestore, `work_items/${workItem.id}/notes`), {
                authorId: user.uid,
                text: `Case re-indexed to new Case ID: ${newWorkItemResult.customId}. ${reindexNotes}`,
                createdAt: new Date().toISOString(),
                workItemId: workItem.id,
                category: 'Re-Indexed',
                subject: 'RE-INDEX',
            });

            toast({ title: 'Work Item Re-Indexed', description: `Successfully created new work item ${newWorkItemResult.customId}.` });
            
            if (reindexOption === 'myself') {
              openTab({ id: newWorkItemResult.id, title: newWorkItemResult.customId, type: 'work-item' });
            }
            
            onCancel(); 
            return;
        }
        case 'clone': {
            if (!cloneToProcess) {
                toast({ variant: 'destructive', title: 'Error', description: 'Please select a process for cloning.' });
                return;
            }
             if (!cloneNotes) {
                toast({ variant: 'destructive', title: 'Error', description: 'Notes are required for cloning.' });
                return;
            }
            
            const assignedTo = cloneOption === 'myself' ? user.uid : cloneToProcess;

            const clonePayload = {
                process: cloneToProcess,
                urgency: workItem.urgency,
                assignedTo: assignedTo,
                createdBy: user.uid,
                relatedContact: workItem.relatedContact,
                overview: `Cloned from ${workItem.customId}. Original overview: ${workItem.overview}`,
                tasks: cloneTasks.map(taskText => ({ 
                    id: `task-${Date.now()}-${Math.random()}`, 
                    text: taskText, 
                    completed: false,
                    createdBy: user.uid,
                    createdAt: new Date().toISOString()
                })),
                sourceWorkItemId: workItem.id,
                reindexReason: 'Cloned',
                reindexNote: `Cloned from Case ID: ${workItem.customId}. ${cloneNotes}`,
            };
            
            const newWorkItemResult = await createWorkItem(clonePayload);

            if (!newWorkItemResult.id || !newWorkItemResult.customId) {
                throw new Error(newWorkItemResult.error || 'Failed to create cloned work item.');
            }

            addDocumentNonBlocking(collection(firestore, `work_items/${workItem.id}/notes`), {
                authorId: user.uid,
                author: user.displayName || user.email,
                text: `Case cloned to new work item: ${newWorkItemResult.customId}. Reason: ${cloneNotes}`,
                createdAt: new Date().toISOString(),
                workItemId: workItem.id,
                category: 'Cloned',
                subject: 'CLONE',
            });
            
             updateDocumentNonBlocking(workItemRef, { lockInfo: null, updatedAt: new Date().toISOString() });

            toast({
                title: 'Work Item Cloned',
                description: `Successfully created new work item ${newWorkItemResult.customId}.`,
            });

            if (cloneOption === 'myself') {
              openTab({ id: newWorkItemResult.id, title: newWorkItemResult.customId, type: 'work-item' });
            }

            onCancel(); 
            return; // Exit after handling
        }
        case 'terminate':
            if (!terminateReason) {
              toast({ variant: 'destructive', title: 'Error', description: 'A reason is required to terminate.' });
              return;
            }
            if (!terminateNotes) {
                toast({ variant: 'destructive', title: 'Error', description: 'Notes are required.' });
                return;
            }
            category = 'Terminated';
            noteText = `Reason: ${terminateReason}. ${terminateNotes}`;
            workItemUpdate.status = 'Closed';
            workItemUpdate.lockInfo = null;
            break;
        case 'transfer': {
            if (!transferToUser) {
              toast({ variant: 'destructive', title: 'Error', description: 'You must select a user to transfer to.' });
              return;
            }
            if (!transferNotes) {
                toast({ variant: 'destructive', title: 'Error', description: 'Notes are required.' });
                return;
            }
            
            const newAssignee = users.find(u => u.uid === transferToUser);
            category = 'Transferred';
            noteText = `Work item transferred to ${newAssignee?.displayName || 'Unknown User'}. ${transferNotes}`;
            workItemUpdate.assignedTo = transferToUser;
            
            updateDocumentNonBlocking(workItemRef, workItemUpdate);
            
            addDocumentNonBlocking(collection(firestore, `work_items/${workItem.id}/notes`), {
              authorId: user.uid,
              text: noteText,
              createdAt: new Date().toISOString(),
              workItemId: workItem.id,
              category,
              subject: subjectForNote,
            });

            toast({ title: 'Work Item Transferred', description: `Case has been transferred to ${newAssignee?.displayName}.` });
            onCancel();
            return;
        }
        case 'pend':
            if (!pendReason) {
              toast({ variant: 'destructive', title: 'Error', description: 'A reason is required to pend.' });
              return;
            }
             if (!pendNotes) {
                toast({ variant: 'destructive', title: 'Error', description: 'Notes are required.' });
                return;
            }
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

  const availableActions = [
      { value: 'resolve-complete', label: 'Resolve Complete' },
      { value: 're-index', label: 'Re-Index' },
      { value: 'clone', label: 'Clone Work Item' },
      { value: 'terminate', label: 'Terminate' },
      { value: 'transfer', label: 'Transfer'},
      { value: 'pend', label: 'Pend' }
  ];
  

  return (
    <form onSubmit={handleSubmit}>
      <Card className="mt-4 border-none shadow-none p-0">
         <CardHeader className="flex-row items-center gap-4 p-0">
            <div className="flex h-7 w-full items-center justify-between bg-black px-4 text-white">
              <div className="flex items-center gap-4">
                <span className="text-sm uppercase">{getActionDisplayName(selectedAction)}</span>
                <span className="text-sm uppercase">OR</span>
                 <Select 
                    onValueChange={(value) => {
                        setSelectedAction(value);
                    }}
                  >
                  <SelectTrigger
                    className="h-6 w-auto border-slate-400 bg-slate-100 text-black hover:bg-slate-200 focus:ring-slate-300 text-xs"
                  >
                    <SelectValue placeholder="--- select a different action ---" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableActions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
        </CardHeader>
        <CardContent className='p-4 border bg-card rounded-b-md'>
          <div>
            {renderActionForm()}
          </div>
        </CardContent>
      </Card>
      
      {selectedAction && (
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} className="h-9">
            Cancel
          </Button>
          <Button type="submit" disabled={!selectedAction} className="h-9 bg-black text-white hover:bg-black/80">
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
            const newCaseId = lastNote.text.match(/Case re-indexed to new Case ID: (\S+)\./)?.[1] || 'N/A';
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
        <div className="flex items-center gap-4 py-2 text-xs">
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
  
  const authorUserRef = useMemoFirebase(() => {
    if (!firestore || !note?.authorId) return null;
    return doc(firestore, 'users', note.authorId);
  }, [firestore, note?.authorId]);

  const { data: authorUser } = useDoc<User>(authorUserRef);

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
    <div className="flex items-center justify-between gap-4 py-2 text-xs">
      <div className="flex items-center gap-4">
        <Clock className="h-5 w-5 text-orange-500" />
        <span className="font-medium">Case Pended until {untilDate}:</span>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-muted-foreground">{reason} by {authorUser?.displayName || '...'}</span>
      </div>
      <Button onClick={handleResume} size="sm" className="h-7 text-xs">Resume Work</Button>
    </div>
  );
}


function CaseLockedInfo({ lockInfo }: { lockInfo: WorkItem['lockInfo'] }) {
    return (
        <div className="flex items-center gap-4 py-2 text-xs text-destructive">
            <Lock className="h-5 w-5" />
            <span className="font-bold">Case is currently locked by:</span>
            <span className="font-medium">{lockInfo?.userName || 'another user'}</span>
        </div>
    );
}

function ImagesTab({ workItemId }: { workItemId: string }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const attachmentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, `work_items/${workItemId}/attachments`), orderBy('uploadedAt', 'desc'));
  }, [firestore, workItemId]);

  const { data: attachments, isLoading } = useCollection<ImageAttachment>(attachmentsQuery);

  const handleDownload = async (attachment: ImageAttachment) => {
    if (attachment.type === 'QUOTE' && attachment.quotationData) {
      setRegeneratingId(attachment.id);
      try {
        const quoteData = attachment.quotationData;
        const subtotal = quoteData.tasks.reduce((acc, task) => acc + (task.quantity * task.unitPrice), 0);
        const tax = subtotal * 0.18;
        const grandTotal = subtotal + tax;

        // Create a temporary div to render the template for canvas conversion
        const printContainer = document.createElement('div');
        printContainer.style.position = 'absolute';
        printContainer.style.left = '-9999px';
        document.body.appendChild(printContainer);

        const root = createRoot(printContainer);
        root.render(
            <QuotationPrintTemplate quotation={quoteData} subtotal={subtotal} tax={tax} grandTotal={grandTotal} />
        );
        
        // Slight delay to ensure rendering is complete
        setTimeout(async () => {
          try {
            const canvas = await html2canvas(printContainer.firstChild as HTMLElement, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            
            pdf.save(attachment.fileName);

            toast({ title: 'PDF Regenerated', description: 'The quotation PDF has been downloaded.' });
          } catch (e) {
            console.error("Failed to generate PDF canvas:", e);
            toast({ variant: 'destructive', title: 'Regeneration Failed', description: 'Could not create PDF content.' });
          } finally {
            // Cleanup
            root.unmount();
            document.body.removeChild(printContainer);
            setRegeneratingId(null);
          }
        }, 200);

      } catch (error: any) {
        console.error("Failed to regenerate PDF:", error);
        toast({ variant: 'destructive', title: 'Regeneration Failed', description: error.message });
        setRegeneratingId(null);
      }
    } else if (attachment.url.startsWith('data:')) {
       const link = document.createElement('a');
       link.href = attachment.url;
       link.download = attachment.fileName;
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-xs text-muted-foreground">Loading attachments...</div>;
  }

  return (
    <div className="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/4 text-xs">Date</TableHead>
            <TableHead className="w-1/4 text-xs">File Name</TableHead>
            <TableHead className="w-1/4 text-xs">Type</TableHead>
            <TableHead className="w-1/4 text-xs">Direction</TableHead>
            <TableHead className="text-right text-xs">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attachments && attachments.map(att => (
            <TableRow key={att.id}>
              <TableCell className="py-2 text-xs">{format(parseISO(att.uploadedAt), 'dd MMM yyyy HH:mm:ss')}</TableCell>
              <TableCell className="py-2 text-xs">{att.fileName}</TableCell>
              <TableCell className="py-2 text-xs">{att.type}</TableCell>
              <TableCell className="py-2 text-xs">{att.direction}</TableCell>
              <TableCell className="py-2 text-xs text-right space-x-2">
                <a
                  href={att.url.startsWith('data:') ? att.url : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: 'link', size: 'sm' }),
                    'h-auto p-0 text-xs',
                    !att.url.startsWith('data:') && 'cursor-not-allowed opacity-50'
                  )}
                  onClick={(e) => !att.url.startsWith('data:') && e.preventDefault()}
                >
                  View
                </a>
                <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => handleDownload(att)}
                    disabled={regeneratingId === att.id}
                >
                    {regeneratingId === att.id ? '...' : 'Download'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {(!attachments || attachments.length === 0) && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-4 text-xs">
                No attachments for this work item.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}


export function WorkItemView({ workItemId, customId }: { workItemId: string, customId: string }) {
  const { firestore, user: currentUser } = useFirebase();
  const { toast } = useToast();
  const [isVerifyingAuthority, setIsVerifyingAuthority] = useState(false);
  const [isAttachmentDialogOpen, setIsAttachmentDialogOpen] = useState(false);
  const [isEditContactDialogOpen, setIsEditContactDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const workItemRef = useMemoFirebase(() => {
      if (!firestore) return null;
      return doc(firestore, 'work_items', workItemId);
  }, [firestore, workItemId, refreshKey]);

  const { data: item, isLoading: isWorkItemLoading } = useDoc<WorkItem>(workItemRef);
  
  const assignedUserRef = useMemoFirebase(() => {
    if (!firestore || !item?.assignedTo) return null;
    // Check if assignedTo is a UID (standard length is 28 chars)
    if (item.assignedTo.length < 20) return null;
    return doc(firestore, 'users', item.assignedTo);
  }, [firestore, item?.assignedTo, refreshKey]);
  
  const createdByUserRef = useMemoFirebase(() => {
    if (!firestore || !item?.createdBy) return null;
    return doc(firestore, 'users', item.createdBy);
  }, [firestore, item?.createdBy, refreshKey]);

  const latestNoteQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
        collection(firestore, `work_items/${workItemId}/notes`),
        orderBy('createdAt', 'desc'),
        limit(1)
    );
  }, [firestore, workItemId, refreshKey]);

  const { data: assignedUser, isLoading: isUserLoading } = useDoc<User>(assignedUserRef);
  const { data: createdByUser, isLoading: isCreatorLoading } = useDoc<User>(createdByUserRef);
  const { data: latestNoteArr, isLoading: isNoteLoading } = useCollection<Note>(latestNoteQuery);
  const latestNote = latestNoteArr?.[0];


  const isLoading = isWorkItemLoading || isUserLoading || isCreatorLoading || isNoteLoading;

  const caseAge = item ? differenceInDays(new Date(), parseISO(item.createdAt)) : 0;
  
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    toast({
        title: 'Refreshed',
        description: 'Work item data has been refreshed.',
    });
  }

  const handleVerifyClick = () => {
    if (!item || !currentUser || !workItemRef || !firestore) return;

    const lockInfo = {
      userId: currentUser.uid,
      userName: currentUser.displayName || 'Unknown User',
      timestamp: new Date().toISOString(),
    };
    
    const isAssignedToCurrentUser = item.assignedTo === currentUser.uid;
    
    if (!isAssignedToCurrentUser) {
      const isAssignedToProcess = item.assignedTo.length < 20;
      // Take over the case
      updateDocumentNonBlocking(workItemRef, {
        assignedTo: currentUser.uid,
        updatedAt: new Date().toISOString(),
        lockInfo: lockInfo,
      });

      addDocumentNonBlocking(collection(firestore, `work_items/${item.id}/notes`), {
        authorId: currentUser.uid,
        text: `Work item taken over from ${isAssignedToProcess ? `process queue '${item.assignedTo}'` : (assignedUser?.displayName || item.assignedTo)} by ${currentUser.displayName}.`,
        createdAt: new Date().toISOString(),
        workItemId: item.id,
        category: 'Assignment',
        subject: 'Work Item Takeover',
      });
      
      toast({
          title: "Case Assigned to You",
          description: `You have taken ownership of case ${item.customId}.`,
      });
    } else {
      // Just lock the case
      updateDocumentNonBlocking(workItemRef, { lockInfo });
    }

    setIsVerifyingAuthority(true);
  };
  
  const handleCancelVerify = () => {
    if (!workItemRef) return;
    updateDocumentNonBlocking(workItemRef, { lockInfo: null });
    setIsVerifyingAuthority(false);
  }

  const handleContactUpdate = (updatedData: ContactInfoUpdateValues) => {
    if (!workItemRef || !item) return;

    const updatedContact = {
      ...item.relatedContact,
      ...updatedData
    };

    updateDocumentNonBlocking(workItemRef, { relatedContact: updatedContact });
    toast({
      title: "Contact Info Updated",
      description: "The customer's information has been successfully updated.",
    });
    setIsEditContactDialogOpen(false);
  };

  if (isLoading || !item) {
    return (
       <div className="flex h-full w-full items-center justify-center p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  const isClosed = item.status === 'Closed' || item.status === 'Re-indexed';
  const isPended = item.status === 'Pending';
  const isLockedByOther = item.lockInfo && item.lockInfo.userId !== currentUser?.uid;
  const isAssignedToProcess = item.assignedTo.length < 20; // Heuristic to check if it's a process name
  
  const lastPendedNote = isPended ? latestNoteArr?.find(n => n.category === 'Pended') : undefined;

  const fullAddress = item.relatedContact.address 
    ? `${item.relatedContact.address.line1}${item.relatedContact.address.line2 ? `, ${item.relatedContact.address.line2}` : ''}, ${item.relatedContact.address.city}, ${item.relatedContact.address.state} ${item.relatedContact.address.zipcode}, ${item.relatedContact.address.country}`
    : 'Not available';


  return (
    <>
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
             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditContactDialogOpen(true)}>
                <FilePenLine className="h-4 w-4" />
                <span className="sr-only">Edit Customer Info</span>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsAttachmentDialogOpen(true)}>
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

      <div className="flex-1 overflow-y-auto px-4 pt-0 sm:px-6">
         <div className="my-2">
            <h2 className="text-base font-semibold">Processes</h2>
            <Separator className="h-[2px] bg-[#A60A0A]" />
             {isVerifyingAuthority ? (
                <VerifyAuthorityForm workItem={item} onCancel={handleCancelVerify} />
            ) : isClosed ? (
                <ClosedWorkItemInfo workItem={item} lastNote={latestNote} />
            ) : isPended ? (
                <PendingWorkItemInfo workItemId={item.id} note={lastPendedNote} />
            ) : isLockedByOther ? (
                <CaseLockedInfo lockInfo={item.lockInfo!} />
            ) : (
                <div className="my-2 flex items-center gap-4 text-sm">
                    <span className="font-medium">Assigned To:</span>
                    <span>{isAssignedToProcess ? item.assignedTo : (assignedUser?.displayName || item.assignedTo)}</span>
                    <Button onClick={handleVerifyClick} className="h-7 bg-black text-white hover:bg-black/80 text-xs">
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
            <TabsTrigger value="quotation" className="relative flex-1 justify-center h-7 rounded-none border-b-2 border-transparent bg-[#A60A0A] px-1 text-xs text-white transition-none hover:bg-[#A60A0A]/80 data-[state=active]:border-transparent data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none">Quotation</TabsTrigger>
            <TabsTrigger value="agency" className="relative flex-1 justify-center h-7 rounded-none border-b-2 border-transparent bg-[#A60A0A] px-1 text-xs text-white transition-none hover:bg-[#A60A0A]/80 data-[state=active]:border-transparent data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none">Agency</TabsTrigger>
          </TabsList>
          
          <div className="mt-0 border-t-0 bg-card px-2">
             <TabsContent value="overview" className="mt-0">
              <div className="grid grid-cols-1 gap-6 p-4 md:grid-cols-2">
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Work Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start text-xs">
                        <UserIcon className="mr-3 mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">Created By</p>
                          <p className="text-muted-foreground">{createdByUser?.displayName || 'N/A'}</p>
                        </div>
                    </div>
                     <div className="flex items-start text-xs">
                        <CalendarIcon className="mr-3 mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">Created On</p>
                          <p className="text-muted-foreground">{format(parseISO(item.createdAt), "PPP p")}</p>
                        </div>
                    </div>
                     <div className="flex items-start text-xs">
                        <History className="mr-3 mt-0.5 h-4 w-4 text-muted-foreground" />
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
                      <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                        {item.overview.split(/[\n,.]+/).map((line, index) => (
                          line.trim() && <li key={index}>{line.trim()}</li>
                        ))}
                      </ul>
                  </CardContent>
                </Card>

                {(item.tasks?.length > 0 || latestNote) && (
                   <div className="grid grid-cols-1 gap-6 md:col-span-2 md:grid-cols-2">
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
                                    <MessageSquare className="mr-3 mt-0.5 h-4 w-4 text-muted-foreground" />
                                    <div className="flex-1">
                                        <p className="font-medium">{latestNote.subject}</p>
                                        <p className="text-muted-foreground">{latestNote.text}</p>
                                        <p className="pt-1 text-xs text-muted-foreground/70">
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
                <CardHeader className="flex flex-row items-center justify-between p-4">
                  <CardTitle className="text-sm">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 p-4 pt-0 text-xs">
                  <div className="flex items-center gap-4">
                    <UserIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="font-medium w-24">Name:</span>
                    <span className="text-muted-foreground">{item.relatedContact.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="font-medium w-24">Email:</span>
                    <a href={`mailto:${item.relatedContact.email}`} className="text-primary hover:underline truncate">{item.relatedContact.email}</a>
                  </div>
                  <div className="flex items-center gap-4">
                    <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="font-medium w-24">Phone:</span>
                    <span className="text-muted-foreground">{item.relatedContact.phone}</span>
                  </div>
                  {item.relatedContact.phoneSecondary && (
                    <div className="flex items-center gap-4">
                      <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="font-medium w-24">Secondary Phone:</span>
                      <span className="text-muted-foreground">{item.relatedContact.phoneSecondary}</span>
                    </div>
                  )}
                  {item.relatedContact.address && (
                    <div className="flex items-start gap-4 col-span-full">
                      <Home className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" />
                      <span className="font-medium w-24">Address:</span>
                      <span className="text-muted-foreground">{fullAddress}</span>
                    </div>
                  )}
                  <Separator className="my-2 col-span-full" />
                  {item.relatedContact.aadharNumber && (
                    <div className="flex items-center gap-4">
                      <Fingerprint className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="font-medium w-24">Aadhar:</span>
                      <span className="text-muted-foreground">{item.relatedContact.aadharNumber}</span>
                    </div>
                  )}
                  {item.relatedContact.panNumber && (
                    <div className="flex items-center gap-4">
                      <Fingerprint className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="font-medium w-24">PAN:</span>
                      <span className="text-muted-foreground">{item.relatedContact.panNumber}</span>
                    </div>
                  )}
                  {item.relatedContact.businessName && (
                    <div className="flex items-center gap-4">
                      <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="font-medium w-24">Business Name:</span>
                      <span className="text-muted-foreground">{item.relatedContact.businessName}</span>
                    </div>
                  )}
                  {item.relatedContact.businessSize && (
                    <div className="flex items-center gap-4">
                      <TrendingUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="font-medium w-24">Business Size:</span>
                      <span className="text-muted-foreground">{item.relatedContact.businessSize}</span>
                    </div>
                  )}
                   {item.relatedContact.businessRevenue && (
                    <div className="flex items-center gap-4">
                      <Banknote className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="font-medium w-24">Revenue:</span>
                      <span className="text-muted-foreground">{item.relatedContact.businessRevenue}</span>
                    </div>
                  )}
                   {item.relatedContact.hasOtherProvider && (
                    <div className="flex items-center gap-4">
                      <Handshake className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="font-medium w-24">Other Provider:</span>
                      <span className="text-muted-foreground">Yes</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks" className="mt-0">
              <TasksTab tasks={item.tasks || []} workItemId={item.id} />
            </TabsContent>

            <TabsContent value="images" className="mt-0">
              <ImagesTab workItemId={item.id} />
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
            <TabsContent value="quotation" className="mt-0">
              <QuotationTab workItem={item} />
            </TabsContent>
            <TabsContent value="agency" className="mt-0">
              <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 p-6">
                <p className="text-xs text-muted-foreground">Agency (Not Implemented)</p>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
    <ImageAttachmentDialog
        workItemId={item.id}
        isOpen={isAttachmentDialogOpen}
        onClose={() => setIsAttachmentDialogOpen(false)}
      />
    <EditContactInfoDialog
        isOpen={isEditContactDialogOpen}
        onClose={() => setIsEditContactDialogOpen(false)}
        contactInfo={item.relatedContact}
        onSave={handleContactUpdate}
    />
    </>
  );
}
