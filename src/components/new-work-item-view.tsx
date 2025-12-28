
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { useTabs } from '@/contexts/tab-context';
import { WorkItemCreateSchema, type WorkItemFormValues } from '@/lib/types';
import { createWorkItem } from '@/ai/flows/create-work-item-flow';
import { ChevronsUpDown, X } from 'lucide-react';
import { useState } from 'react';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Checkbox } from './ui/checkbox';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const processTaskMap: Record<string, string[]> = {
    "New Business Request": ["Request Inmation & Quotation", "Request Website Development", "Request Mobile App Development", "Request Digital Marketing", "Request Meeting/Consultation", "Request Backend Support", "Request Graphic Design", "Request SEO Services", "Request Product Demo", "Request Project Proposal", "Request Maintenance Contract (AMC)", "Request Domain & Hosting", "Request Content Writing", "Request E-commerce Solution", "Request Automation & Micros", "Request Custom Software", "Request Urgent Repair (New Client)", "Request Callback", "Request Call for New Lead", "Request Other Services"],
    "Development Services (Web & App)": ["New Corporate Website Build", "New E-Commerce Store Build", "Android App Development", "IOS App Development", "Hybrid App Development", "Excel Automation Micros", "CRM / ERP System Development", "Landing Page Creation", "Website Redesign Project", "Payment Gateway Integration", "API Development & Integration", "Admin Panel / Dashboard Build", "User Portal Development", "Chatbot Integration", "SaaS Platform Development", "Plugin / Extension Development", "UI/UX Design Mockups", "Database Structure Design", "Third-Party Tool Integration", "Website Speed Optimization"],
    "Operations & Support (Backend)": ["Server Down / Critical Issue", "Database Connection Error", "Fix Application Bug", "Restore Data form Backup", "Install SSL Certificate", "Migrate Server to Cloud", "Optimize Server Speed", "Update Security Patches", "Configure Firewalls", "Fix Email/SMTP Issues", "Resolve API Failure", "Clean Malware / Virus", "Update PHP/Node Version", "Manage User Permissions", "Setup Cron Jobs", "Review Error Logs", "DNS / Domain Configuration", "Hosting CPanel Support", "Automation Script Failure", "General Maintenance Task"],
    "Digital Services Request": ["Start SEO Campaign", "Start Google Ads (PPC)", "Start Facebook/Insta Ads", "Create Social Media Calendar", "Write Blog Content", "Design Marketing Graphics", "Setup Email Newsletter", "Create Promotional Video", "Manage LinkedIn Profile", "Setup Google Analytics", "Optimize Google My Business", "Manage Online Reviews", "Create Landing Page Copy", "Influencer Marketing Setup", "App Store Optimization (ASO)", "YouTube Channel Management", "Brand Identity Design", "Competitor Analysis Report", "Monthly Performance Report"],
    "Feedback / Complaint": ["Report a System Crash", "Report Slow Performance", "Report Login Issue", "Report Data Error", "Report UI/Design Flaw", "Complaint about Billing", "Complaint about Delay", "Complaint about Support Quality", "Complaint about Communication", "Suggest New Feature", "Suggest Design Change", "Suggest Process Improvement", "Escalation to Management", "Review: Positive Feedback", "Review: Negative Feedback", "Request for Refund", "Request for Contract Cancellation", "Report Security Concern", "Post-Project Feedback", "General Complaint"],
    "Other Service Request": ["Inquire about Invoice", "Inquire about Job Opening", "Inquire about Internship", "Inquire about Training", "Renew Domain Name", "Renew Hosting Plan", "Purchase Software License", "Update Company Details", "Request Tax Document", "Schedule Annual Review", "Vendor Sales Pitch", "Legal / Compliance Query", "Media / Press Inquiry", "Sponsorship Request", "Employee Referral", "Internal Admin Task", "Hardware Requirement", "Network Setup Request", "Office Visit Request", "Unclassified Request"]
};

const processTypes = Object.keys(processTaskMap);

export function NewWorkItemView() {
  const { user } = useFirebase();
  const { closeTab, openTab } = useTabs();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);


  const form = useForm<WorkItemFormValues>({
    resolver: zodResolver(WorkItemCreateSchema),
    defaultValues: {
      process: '',
      urgency: 'Medium',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerPhoneSecondary: '',
      customerAddress: {
        country: '',
        line1: '',
        line2: '',
        city: '',
        state: '',
        zipcode: ''
      },
      overview: '',
      initialTasks: [],
      assignTo: 'initial_indexing',
    },
  });

  const selectedProcess = form.watch('process');

  const onSubmit = async (data: WorkItemFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    setIsSubmitting(true);
    
    const assignedTo = data.assignTo === 'myself' ? user.uid : selectedProcess;

    const payload = {
      process: data.process,
      urgency: data.urgency,
      assignedTo: assignedTo,
      createdBy: user.uid,
      relatedContact: {
        name: data.customerName,
        email: data.customerEmail,
        phone: data.customerPhone,
        phoneSecondary: data.customerPhoneSecondary,
        address: data.customerAddress
      },
      overview: data.overview,
      tasks: selectedTasks.map(taskText => ({ 
        id: `task-${Date.now()}-${Math.random()}`, 
        text: taskText, 
        completed: false,
        createdBy: user.uid,
        createdAt: new Date().toISOString()
      })),
    };

    try {
      const result = await createWorkItem(payload);
      if (result.id && result.customId) {
        toast({
          title: 'Work Item Created',
          description: `Work Item ${result.customId} has been successfully created.`,
        });
        
        if(data.assignTo === 'myself') {
          openTab({ id: result.id, title: result.customId, type: 'work-item' });
        }
        
        closeTab('new-work-item');
      } else {
        throw new Error(result.error || 'An unknown error occurred.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCancel = () => {
    closeTab('new-work-item');
  };

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-full">
      <div className="mb-6">
          <h1 className="font-headline text-lg font-bold tracking-tight">Create New Work Item</h1>
          <p className="text-xs text-muted-foreground">Fill out the details to create a new work item.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                 <Card>
                    <CardHeader><CardTitle className="text-base">Customer Contact Information</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="customerName" render={({ field }) => (<FormItem><FormLabel>Customer Name</FormLabel><FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="customerEmail" render={({ field }) => (<FormItem><FormLabel>Customer Email</FormLabel><FormControl><Input placeholder="e.g., john.doe@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="customerPhone" render={({ field }) => (<FormItem><FormLabel>Customer Phone</FormLabel><FormControl><Input placeholder="e.g., +1 555-1234" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="customerPhoneSecondary" render={({ field }) => (<FormItem><FormLabel>Secondary Phone</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                         <FormField control={form.control} name="customerAddress.line1" render={({ field }) => (<FormItem><FormLabel>Address Line 1</FormLabel><FormControl><Input placeholder="e.g., 123 Main St" {...field} /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={form.control} name="customerAddress.line2" render={({ field }) => (<FormItem><FormLabel>Address Line 2</FormLabel><FormControl><Input placeholder="e.g., Apt 4B" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <FormField control={form.control} name="customerAddress.city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="customerAddress.state" render={({ field }) => (<FormItem><FormLabel>State / Province</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="customerAddress.zipcode" render={({ field }) => (<FormItem><FormLabel>Zip / Postal Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="customerAddress.country" render={({ field }) => (<FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                    </CardContent>
                 </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Work Item Details</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="urgency" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Urgency</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select urgency" /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="Low">Low</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="High">High</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                    </div>
                     <FormField control={form.control} name="overview" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Overview / Description</FormLabel>
                        <FormControl><Textarea placeholder="Provide a detailed description of the work item..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">Tasks &amp; Assignment</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                     <FormField control={form.control} name="process" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Process</FormLabel>
                          <Select onValueChange={(value) => { field.onChange(value); setSelectedTasks([]); }} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a process" /></SelectTrigger></FormControl>
                            <SelectContent>{processTypes.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                     <FormItem>
                        <FormLabel>Initial Tasks</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" disabled={!selectedProcess} className={cn("w-full justify-between h-9", !selectedTasks.length && "text-muted-foreground")}>
                              {selectedTasks.length > 0 ? `${selectedTasks.length} tasks selected` : "Select initial tasks"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                              <CommandInput placeholder="Search tasks..." />
                              <CommandList>
                                <CommandEmpty>No tasks found for this process.</CommandEmpty>
                                <CommandGroup>
                                  {(processTaskMap[selectedProcess] || []).map((task) => (
                                    <CommandItem key={task} onSelect={() => { const isSelected = selectedTasks.includes(task); setSelectedTasks(isSelected ? selectedTasks.filter(t => t !== task) : [...selectedTasks, task]); }}>
                                      <Checkbox checked={selectedTasks.includes(task)} className="mr-2" />
                                      {task}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                     <FormField control={form.control} name="assignTo" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign To</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="initial_indexing" /></FormControl><FormLabel className="font-normal">Initial Indexing Queue</FormLabel></FormItem>
                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="myself" /></FormControl><FormLabel className="font-normal">Assign to Myself</FormLabel></FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>
              </div>
          </div>
         
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Work Item'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
