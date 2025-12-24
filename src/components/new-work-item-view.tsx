
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { useTabs } from '@/contexts/tab-context';
import { WorkItemCreateSchema, type WorkItemFormValues } from '@/lib/types';
import { createWorkItem } from '@/ai/flows/create-work-item-flow';
import { ArrowLeft, Check, ChevronsUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';

const processTaskMap: Record<string, string[]> = {
    "New Business Request": ["Request Inmation & Quotation", "Request Website Development", "Request Mobile App Development", "Request Digital Marketing", "Request Meeting/Consultation", "Request Backend Support", "Request Graphic Design", "Request SEO Services", "Request Product Demo", "Request Project Proposal", "Request Maintenance Contract (AMC)", "Request Domain & Hosting", "Request Content Writing", "Request E-commerce Solution", "Request Automation & Micros", "Request Custom Software", "Request Urgent Repair (New Client)", "Request Callback", "Request Other Services"],
    "Development Services (Web & App)": ["New Corporate Website Build", "New E-Commerce Store Build", "Android App Development", "IOS App Development", "Hybrid App Development", "Excel Automation Micros", "CRM / ERP System Development", "Landing Page Creation", "Website Redesign Project", "Payment Gateway Integration", "API Development & Integration", "Admin Panel / Dashboard Build", "User Portal Development", "Chatbot Integration", "SaaS Platform Development", "Plugin / Extension Development", "UI/UX Design Mockups", "Database Structure Design", "Third-Party Tool Integration", "Website Speed Optimization"],
    "Operations & Support (Backend)": ["Server Down / Critical Issue", "Database Connection Error", "Fix Application Bug", "Restore Data form Backup", "Install SSL Certificate", "Migrate Server to Cloud", "Optimize Server Speed", "Update Security Patches", "Configure Firewalls", "Fix Email/SMTP Issues", "Resolve API Failure", "Clean Malware / Virus", "Update PHP/Node Version", "Manage User Permissions", "Setup Cron Jobs", "Review Error Logs", "DNS / Domain Configuration", "Hosting CPanel Support", "Automation Script Failure", "General Maintenance Task"],
    "Digital Services Request": ["Start SEO Campaign", "Start Google Ads (PPC)", "Start Facebook/Insta Ads", "Create Social Media Calendar", "Write Blog Content", "Design Marketing Graphics", "Setup Email Newsletter", "Create Promotional Video", "Manage LinkedIn Profile", "Setup Google Analytics", "Optimize Google My Business", "Manage Online Reviews", "Create Landing Page Copy", "Influencer Marketing Setup", "App Store Optimization (ASO)", "YouTube Channel Management", "Brand Identity Design", "Competitor Analysis Report", "Monthly Performance Report"],
    "Feedback / Complaint": ["Report a System Crash", "Report Slow Performance", "Report Login Issue", "Report Data Error", "Report UI/Design Flaw", "Complaint about Billing", "Complaint about Delay", "Complaint about Support Quality", "Complaint about Communication", "Suggest New Feature", "Suggest Design Change", "Suggest Process Improvement", "Escalation to Management", "Review: Positive Feedback", "Review: Negative Feedback", "Request for Refund", "Request for Contract Cancellation", "Report Security Concern", "Post-Project Feedback", "General Complaint"],
    "Other Service Request": ["Inquire about Invoice", "Inquire about Job Opening", "Inquire about Internship", "Inquire about Training", "Renew Domain Name", "Renew Hosting Plan", "Purchase Software License", "Update Company Details", "Request Tax Document", "Schedule Annual Review", "Vendor Sales Pitch", "Legal / Compliance Query", "Media / Press Inquiry", "Sponsorship Request", "Employee Referral", "Internal Admin Task", "Hardware Requirement", "Network Setup Request", "Office Visit Request", "Unclassified Request"]
};

const processTypes = Object.keys(processTaskMap);

export function NewWorkItemView() {
  const { user } = useFirebase();
  const { openTab, closeTab } = useTabs();
  const { toast } = useToast();
  const [selectedProcess, setSelectedProcess] = useState<string>(processTypes[0]);
  const [assignmentOption, setAssignmentOption] = useState<'myself' | 'initial'>('myself');

  const form = useForm<WorkItemFormValues>({
    resolver: zodResolver(WorkItemCreateSchema),
    defaultValues: {
      process: processTypes[0],
      tasks: [],
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerPhoneSecondary: '',
      customerAddress: '',
      urgency: 'Medium',
      overview: '',
    },
  });

  const onSubmit = async (data: WorkItemFormValues) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to create a work item.',
      });
      return;
    }

    try {
      const assignedTo = assignmentOption === 'myself' ? user.uid : data.process;
      
      const payload = {
        process: data.process,
        urgency: data.urgency,
        assignedTo,
        createdBy: user.uid,
        relatedContact: {
          name: data.customerName,
          email: data.customerEmail,
          phone: data.customerPhone,
          phoneSecondary: data.customerPhoneSecondary || '',
          address: data.customerAddress || '',
        },
        overview: data.overview,
        tasks: data.tasks.map(taskText => ({ id: `task-${Date.now()}-${Math.random()}`, text: taskText, completed: false })),
      };
      
      const result = await createWorkItem(payload);

      if (result.id && result.customId) {
        toast({
          title: 'Work Item Created',
          description: `Work item "${result.customId}" has been successfully created.`,
        });

        form.reset();
        closeTab('new-work-item');
        
        if (assignmentOption === 'myself') {
          openTab({
            id: result.id,
            title: result.customId,
            type: 'work-item',
          });
        }
      } else {
        throw new Error(result.error || 'An unknown error occurred.');
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error Creating Work Item',
        description: e.message || 'An unexpected error occurred.',
      });
    }
  };

  const handleCancel = () => {
    closeTab('new-work-item');
  };
  
  const handleProcessChange = (value: string) => {
    setSelectedProcess(value);
    form.setValue('process', value);
    form.setValue('tasks', []); // Reset tasks when process changes
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={handleCancel}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div>
          <h1 className="font-headline text-base font-bold tracking-tight">Create New Work Item</h1>
          <p className="text-xs text-muted-foreground">Fill out the details below to create a new work item.</p>
        </div>
      </div>
       <Card>
        <CardHeader>
           <CardTitle className="text-sm">Work Item Details</CardTitle>
        </CardHeader>
        <CardContent>
           <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
               <div className="space-y-4">
                  <div className="flex items-center">
                    <FormLabel className="w-1/4 text-xs font-semibold">Assignment Option</FormLabel>
                    <div className="w-3/4">
                       <RadioGroup value={assignmentOption} onValueChange={(v) => setAssignmentOption(v as 'myself' | 'initial')} className="flex h-7 items-center gap-4 text-xs">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="myself" id="create-myself" />
                            <Label htmlFor="create-myself" className="flex h-7 items-center text-xs font-normal">Create myself</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="initial" id="create-initial" />
                            <Label htmlFor="create-initial" className="flex h-7 items-center text-xs font-normal">Return to initial Indexing</Label>
                          </div>
                        </RadioGroup>
                    </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                 <FormField
                  control={form.control}
                  name="process"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Process</FormLabel>
                      <Select
                        onValueChange={handleProcessChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {processTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                    control={form.control}
                    name="tasks"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel className="text-xs">Tasks</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                    "w-full justify-between h-9",
                                    !field.value?.length && "text-muted-foreground"
                                )}
                                >
                                {field.value?.length > 0 ? `${field.value.length} selected` : "Select tasks"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command>
                                  <CommandInput placeholder="Search tasks..." />
                                  <CommandList>
                                  <CommandEmpty>No tasks found.</CommandEmpty>
                                  <CommandGroup>
                                      {(processTaskMap[selectedProcess] || []).map((task) => (
                                        <CommandItem
                                            key={task}
                                            onSelect={() => {
                                                const selectedTasks = field.value || [];
                                                const isSelected = selectedTasks.includes(task);
                                                const newTasks = isSelected
                                                ? selectedTasks.filter((t) => t !== task)
                                                : [...selectedTasks, task];
                                                form.setValue('tasks', newTasks);
                                            }}
                                            >
                                            <Checkbox
                                                checked={field.value?.includes(task)}
                                                className="mr-2"
                                            />
                                            {task}
                                        </CommandItem>
                                      ))}
                                  </CommandGroup>
                                  </CommandList>
                              </Command>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                 <FormField
                  control={form.control}
                  name="urgency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Urgency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Customer Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Customer Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Customer Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="customerPhoneSecondary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Customer Phone Secondary</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="customerAddress"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel className="text-xs">Customer Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter customer's full address"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="overview"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel className="text-xs">Overview / Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>


              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit">Create Work Item</Button>
              </div>
            </form>
          </Form>
        </CardContent>
       </Card>
    </div>
  );
}
