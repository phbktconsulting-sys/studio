
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
import { ArrowLeft, ChevronsUpDown, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { cn } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';

const processTypes = [
  "New Business Request",
  "Development Services (Web & App)",
  "Operations & Support (Backend)",
  "Digital Services Request",
  "Feedback / Complaint",
  "Other Service Request"
];

const processTaskMap: Record<string, string[]> = {
    "New Business Request": ["Request Inmation & Quotation", "Request Website Development", "Request Mobile App Development", "Request Digital Marketing", "Request Meeting/Consultation", "Request Backend Support", "Request Graphic Design", "Request SEO Services", "Request Product Demo", "Request Project Proposal", "Request Maintenance Contract (AMC)", "Request Domain & Hosting", "Request Content Writing", "Request E-commerce Solution", "Request Automation & Micros", "Request Custom Software", "Request Urgent Repair (New Client)", "Request Callback", "Request Other Services"],
    "Development Services (Web & App)": ["New Corporate Website Build", "New E-Commerce Store Build", "Android App Development", "IOS App Development", "Hybrid App Development", "Excel Automation Micros", "CRM / ERP System Development", "Landing Page Creation", "Website Redesign Project", "Payment Gateway Integration", "API Development & Integration", "Admin Panel / Dashboard Build", "User Portal Development", "Chatbot Integration", "SaaS Platform Development", "Plugin / Extension Development", "UI/UX Design Mockups", "Database Structure Design", "Third-Party Tool Integration", "Website Speed Optimization"],
    "Operations & Support (Backend)": ["Server Down / Critical Issue", "Database Connection Error", "Fix Application Bug", "Restore Data form Backup", "Install SSL Certificate", "Migrate Server to Cloud", "Optimize Server Speed", "Update Security Patches", "Configure Firewalls", "Fix Email/SMTP Issues", "Resolve API Failure", "Clean Malware / Virus", "Update PHP/Node Version", "Manage User Permissions", "Setup Cron Jobs", "Review Error Logs", "DNS / Domain Configuration", "Hosting CPanel Support", "Automation Script Failure", "General Maintenance Task"],
    "Digital Services Request": ["Start SEO Campaign", "Start Google Ads (PPC)", "Start Facebook/Insta Ads", "Create Social Media Calendar", "Write Blog Content", "Design Marketing Graphics", "Setup Email Newsletter", "Create Promotional Video", "Manage LinkedIn Profile", "Setup Google Analytics", "Optimize Google My Business", "Manage Online Reviews", "Create Landing Page Copy", "Influencer Marketing Setup", "App Store Optimization (ASO)", "YouTube Channel Management", "Brand Identity Design", "Competitor Analysis Report", "Monthly Performance Report"],
    "Feedback / Complaint": ["Report a System Crash", "Report Slow Performance", "Report Login Issue", "Report Data Error", "Report UI/Design Flaw", "Complaint about Billing", "Complaint about Delay", "Complaint about Support Quality", "Complaint about Communication", "Suggest New Feature", "Suggest Design Change", "Suggest Process Improvement", "Escalation to Management", "Review: Positive Feedback", "Review: Negative Feedback", "Request for Refund", "Request for Contract Cancellation", "Report Security Concern", "Post-Project Feedback", "General Complaint"],
    "Other Service Request": ["Inquire about Invoice", "Inquire about Job Opening", "Inquire about Internship", "Inquire about Training", "Renew Domain Name", "Renew Hosting Plan", "Purchase Software License", "Update Company Details", "Request Tax Document", "Schedule Annual Review", "Vendor Sales Pitch", "Legal / Compliance Query", "Media / Press Inquiry", "Sponsorship Request", "Employee Referral", "Internal Admin Task", "Hardware Requirement", "Network Setup Request", "Office Visit Request", "Unclassified Request"]
};

export function NewWorkItemView() {
  const { user } = useFirebase();
  const { openTab, closeTab } = useTabs();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<WorkItemFormValues>({
    resolver: zodResolver(WorkItemCreateSchema),
    defaultValues: {
      urgency: 'Medium',
      assignTo: 'initial_indexing',
      initialTasks: [],
    },
  });

  const selectedProcess = form.watch('process');

  const onSubmit = async (data: WorkItemFormValues) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to create a work item.',
      });
      return;
    }
    setIsSubmitting(true);

    const isAssignToSelf = data.assignTo === 'myself';

    try {
      const payload = {
        process: data.process,
        urgency: data.urgency,
        assignedTo: isAssignToSelf ? user.uid : data.process, // Assign to process name if not self
        createdBy: user.uid,
        relatedContact: {
          name: data.customerName,
          email: data.customerEmail,
          phone: data.customerPhone,
          phoneSecondary: data.customerPhoneSecondary,
          address: data.customerAddress,
        },
        overview: data.overview,
        tasks: data.initialTasks?.map(taskText => ({
            id: `task-${Date.now()}-${Math.random()}`, 
            text: taskText, 
            completed: false,
            createdBy: user.uid,
            createdAt: new Date().toISOString()
        })) || [],
      };
      
      const result = await createWorkItem(payload);

      if (result.id && result.customId) {
        toast({
          title: 'Work Item Created',
          description: `Work Item ${result.customId} has been successfully created.`,
        });
        
        if (isAssignToSelf) {
            openTab({
                id: result.id,
                title: result.customId,
                type: 'work-item',
            });
        }
        
        closeTab('new-work-item');
      } else {
        throw new Error(result.error || 'An unknown error occurred.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Creating Work Item',
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
    <div className="p-4 sm:p-6 bg-slate-50">
      <div className="">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
          <div>
            <h1 className="font-headline text-xl font-bold tracking-tight">Create New Work Item</h1>
            <p className="text-sm text-muted-foreground">Fill out the details below to create a new work item.</p>
          </div>
        </div>
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* --- Form Row: Process & Urgency --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <FormField
                      control={form.control}
                      name="process"
                      render={({ field }) => (
                        <FormItem className="grid grid-cols-3 gap-4 items-start">
                          <div className="col-span-1 pt-1.5">
                            <FormLabel>Process</FormLabel>
                            <p className="text-xs text-muted-foreground mt-1">Select the type of work.</p>
                          </div>
                          <div className="col-span-2">
                            <Select onValueChange={(value) => { field.onChange(value); form.setValue('initialTasks', []); }} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a process" />
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
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="urgency"
                      render={({ field }) => (
                        <FormItem className="grid grid-cols-3 gap-4 items-start">
                          <div className="col-span-1 pt-1.5">
                            <FormLabel>Urgency</FormLabel>
                            <p className="text-xs text-muted-foreground mt-1">Set the priority level.</p>
                          </div>
                          <div className="col-span-2">
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select urgency" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                <SelectItem value="Low">Low</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="High">High</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                </div>
                
                {/* --- Form Row: Customer Info --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                     <FormField
                        control={form.control}
                        name="customerName"
                        render={({ field }) => (
                            <FormItem className="grid grid-cols-3 gap-4 items-start">
                                <div className="col-span-1 pt-1.5">
                                    <FormLabel>Customer Name</FormLabel>
                                </div>
                                <div className="col-span-2">
                                    <Input {...field} />
                                    <FormMessage />
                                </div>
                            </FormItem>
                        )}
                        />
                     <FormField
                        control={form.control}
                        name="customerEmail"
                        render={({ field }) => (
                            <FormItem className="grid grid-cols-3 gap-4 items-start">
                                <div className="col-span-1 pt-1.5">
                                    <FormLabel>Customer Email</FormLabel>
                                </div>
                                <div className="col-span-2">
                                    <Input type="email" {...field} />
                                    <FormMessage />
                                </div>
                            </FormItem>
                        )}
                        />
                </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                     <FormField
                        control={form.control}
                        name="customerPhone"
                        render={({ field }) => (
                            <FormItem className="grid grid-cols-3 gap-4 items-start">
                                <div className="col-span-1 pt-1.5">
                                    <FormLabel>Customer Phone</FormLabel>
                                </div>
                                <div className="col-span-2">
                                    <Input {...field} />
                                    <FormMessage />
                                </div>
                            </FormItem>
                        )}
                        />
                      <FormField
                        control={form.control}
                        name="customerPhoneSecondary"
                        render={({ field }) => (
                          <FormItem className="grid grid-cols-3 gap-4 items-start">
                                <div className="col-span-1 pt-1.5">
                                    <FormLabel>Secondary Phone</FormLabel>
                                </div>
                                <div className="col-span-2">
                                    <Input {...field} placeholder="(Optional)" />
                                    <FormMessage />
                                </div>
                          </FormItem>
                        )}
                      />
                </div>
                
                <div className="grid grid-cols-3 gap-4 items-start">
                    <div className="col-span-1 pt-1.5">
                        <FormLabel>Customer Address</FormLabel>
                         <p className="text-xs text-muted-foreground mt-1">Enter the customer's full address.</p>
                    </div>
                    <div className="col-span-2 space-y-4">
                        <FormField
                            control={form.control}
                            name="customerAddress.country"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input {...field} placeholder="Country" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="customerAddress.line1"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input {...field} placeholder="Address line 1" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="customerAddress.line2"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input {...field} placeholder="Address line 2 (Optional)" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-3 gap-4">
                           <FormField
                                control={form.control}
                                name="customerAddress.city"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input {...field} placeholder="City" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                           <FormField
                                control={form.control}
                                name="customerAddress.state"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input {...field} placeholder="State" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                           <FormField
                                control={form.control}
                                name="customerAddress.zipcode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input {...field} placeholder="Zipcode" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </div>


                {/* --- Form Row: Overview --- */}
                <FormField
                  control={form.control}
                  name="overview"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <div className="md:col-span-1 pt-1.5">
                        <FormLabel>Overview</FormLabel>
                        <p className="text-xs text-muted-foreground mt-1">Provide a detailed description of the work item.</p>
                      </div>
                      <div className="md:col-span-2">
                        <Textarea {...field} className="min-h-24" />
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                {/* --- Form Row: Initial Tasks --- */}
                <FormField
                  control={form.control}
                  name="initialTasks"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                        <div className="md:col-span-1 pt-1.5">
                            <FormLabel>Initial Tasks</FormLabel>
                            <p className="text-xs text-muted-foreground mt-1">Select one or more initial tasks to add to this work item.</p>
                        </div>
                        <div className="md:col-span-2 flex flex-col gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn("w-full justify-between", !field.value?.length && "text-muted-foreground")}
                                    disabled={!selectedProcess}
                                    >
                                    {field.value?.length > 0 ? `${field.value.length} tasks selected` : (selectedProcess ? "Select initial tasks" : "Select a process first")}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search tasks..." />
                                    <CommandList>
                                    <CommandEmpty>No tasks found for this process.</CommandEmpty>
                                    <CommandGroup>
                                        {(processTaskMap[selectedProcess] || []).map((task) => (
                                            <CommandItem
                                                key={task}
                                                onSelect={() => {
                                                    const isSelected = field.value?.includes(task);
                                                    field.onChange(isSelected ? field.value?.filter(t => t !== task) : [...(field.value || []), task]);
                                                }}
                                            >
                                                <Checkbox checked={field.value?.includes(task)} className="mr-2" />
                                                {task}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                    </CommandList>
                                </Command>
                                </PopoverContent>
                            </Popover>
                             {field.value && field.value.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                    {field.value.map(task => (
                                        <Badge key={task} variant="secondary" className="font-normal">
                                            {task}
                                            <button
                                                type="button"
                                                className="ml-1.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                                                onClick={() => field.onChange(field.value?.filter(t => t !== task))}
                                            >
                                                <X className="h-3 w-3" />
                                                <span className="sr-only">Remove {task}</span>
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                            <FormMessage />
                        </div>
                    </FormItem>
                  )}
                />
                
                 {/* --- Form Row: Assignment --- */}
                <FormField
                  control={form.control}
                  name="assignTo"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                       <div className="md:col-span-1 pt-1.5">
                            <FormLabel>Assign To</FormLabel>
                            <p className="text-xs text-muted-foreground mt-1">Choose who this work item will be assigned to upon creation.</p>
                       </div>
                       <div className="md:col-span-2">
                            <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex space-x-4 pt-1.5"
                            >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                    <RadioGroupItem value="initial_indexing" />
                                </FormControl>
                                <FormLabel className="font-normal">Initial Indexing Queue</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                    <RadioGroupItem value="myself" />
                                </FormControl>
                                <FormLabel className="font-normal">Assign to Myself</FormLabel>
                                </FormItem>
                            </RadioGroup>
                       </div>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-8">
                  <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Work Item'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
