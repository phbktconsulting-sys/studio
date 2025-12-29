
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { useTabs } from '@/contexts/tab-context';
import { WorkItemCreateSchema, type WorkItem, type WorkItemFormValues, type Customer } from '@/lib/types';
import { createWorkItem } from '@/ai/flows/create-work-item-flow';
import { ChevronsUpDown, X, UserCheck, Users, FilePlus } from 'lucide-react';
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
import { Badge } from './ui/badge';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';


const processTaskMap: Record<string, string[]> = {
    "New Business Request": ["Request Inmation & Quotation", "Request Website Development", "Request Mobile App Development", "Request Digital Marketing", "Request Meeting/Consultation", "Request Backend Support", "Request Graphic Design", "Request SEO Services", "Request Product Demo", "Request Project Proposal", "Request Maintenance Contract (AMC)", "Request Domain & Hosting", "Request Content Writing", "Request E-commerce Solution", "Request Automation & Micros", "Request Custom Software", "Request Urgent Repair (New Client)", "Request Callback", "Request Call for New Lead", "Request Other Services"],
    "Development Services (Web & App)": ["New Corporate Website Build", "New E-Commerce Store Build", "Android App Development", "IOS App Development", "Hybrid App Development", "Excel Automation Micros", "CRM / ERP System Development", "Landing Page Creation", "Website Redesign Project", "Payment Gateway Integration", "API Development & Integration", "Admin Panel / Dashboard Build", "User Portal Development", "Chatbot Integration", "SaaS Platform Development", "Plugin / Extension Development", "UI/UX Design Mockups", "Database Structure Design", "Third-Party Tool Integration", "Website Speed Optimization"],
    "Operations & Support (Backend)": ["Server Down / Critical Issue", "Database Connection Error", "Fix Application Bug", "Restore Data form Backup", "Install SSL Certificate", "Migrate Server to Cloud", "Optimize Server Speed", "Update Security Patches", "Configure Firewalls", "Fix Email/SMTP Issues", "Resolve API Failure", "Clean Malware / Virus", "Update PHP/Node Version", "Manage User Permissions", "Setup Cron Jobs", "Review Error Logs", "DNS / Domain Configuration", "Hosting CPanel Support", "Automation Script Failure", "General Maintenance Task"],
    "Digital Services Request": ["Start SEO Campaign", "Start Google Ads (PPC)", "Start Facebook/Insta Ads", "Create Social Media Calendar", "Write Blog Content", "Design Marketing Graphics", "Setup Email Newsletter", "Create Promotional Video", "Manage LinkedIn Profile", "Setup Google Analytics", "Optimize Google My Business", "Manage Online Reviews", "Create Landing Page Copy", "Influencer Marketing Setup", "App Store Optimization (ASO)", "YouTube Channel Management", "Brand Identity Design", "Competitor Analysis Report", "Monthly Performance Report"],
    "Feedback / Complaint": ["Report a System Crash", "Report Slow Performance", "Report Login Issue", "Report Data Error", "Report UI/Design Flaw", "Complaint about Billing", "Complaint about Delay", "Complaint about Support Quality", "Complaint about Communication", "Suggest New Feature", "Suggest Design Change", "Suggest Process Improvement", "Escalation to Management", "Review: Positive Feedback", "Review: Negative Feedback", "Request for Refund", "Request for Contract Cancellation", "Report Security Concern", "Post-Project Feedback", "General Complaint"],
    "Other Service Request": ["Inquire about Invoice", "Inquire about Job Opening", "Inquire about Internship", "Inquire about Training", "Renew Domain Name", "Renew Hosting Plan", "Purchase Software License", "Update Company Details", "Request Tax Document", "Schedule Annual Review", "Vendor Sales Pitch", "Legal / Compliance Query", "Media / Press Inquiry", "Sponsorship Request", "Employee Referral", "Internal Admin Task", "Hardware Requirement", "Network Setup Request", "Office Visit Request", "Unclassified Request"]
};

const processTypes = Object.keys(processTaskMap);

const leadTypes = ["Self Sources", "Referred Sources", "Digital Sources", "Offline Sources", "Partner / Third-Party"];

type ExistingCustomerInfo = WorkItem['relatedContact'];


export function NewWorkItemView() {
  const { user, firestore } = useFirebase();
  const { closeTab, openTab } = useTabs();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [existingCustomer, setExistingCustomer] = useState<ExistingCustomerInfo | null>(null);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);


  const form = useForm<WorkItemFormValues>({
    resolver: zodResolver(WorkItemCreateSchema),
    defaultValues: {
      process: '',
      leadType: 'Self Sources',
      urgency: 'Medium',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerPhoneSecondary: '',
      customerAddress: {
        line1: '',
        line2: '',
        city: '',
        state: '',
        country: '',
        zipcode: ''
      },
      overview: '',
      initialTasks: [],
      assignTo: 'initial_indexing',
      hasBusiness: 'no',
      businessName: '',
    },
  });

  const selectedProcess = form.watch('process');
  const assignment = form.watch('assignTo');
  const hasBusiness = form.watch('hasBusiness');
  
  const checkForExistingCustomer = async (phone: string) => {
    if (!phone || !firestore) return;
    setIsCheckingPhone(true);
    setExistingCustomer(null); // Reset on new check
    try {
      // 1. Prioritize searching the 'customers' collection by phone number on work items
      const workItemsByPhoneQuery = query(
        collection(firestore, 'work_items'),
        where('relatedContact.phone', '==', phone),
        limit(1)
      );
      const workItemsSnapshot = await getDocs(workItemsByPhoneQuery);

      if (!workItemsSnapshot.empty) {
          const workItemData = workItemsSnapshot.docs[0].data() as WorkItem;
          // Use the contact info from the most recent work item
          setExistingCustomer(workItemData.relatedContact);
          return; // Found a match, no need to continue
      }
      
    } catch (error) {
      console.error("Error checking for existing customer:", error);
    } finally {
      setIsCheckingPhone(false);
    }
  };


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
      leadType: data.leadType,
      assignedTo: assignedTo,
      createdBy: user.uid,
      relatedContact: {
        name: data.customerName,
        email: data.customerEmail,
        phone: data.customerPhone,
        phoneSecondary: data.customerPhoneSecondary,
        address: data.customerAddress,
        businessName: data.businessName,
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

  const handleAlertClose = (proceed: boolean) => {
    if (proceed && existingCustomer) {
      form.reset({
        ...form.getValues(),
        customerName: existingCustomer.name || '',
        customerEmail: existingCustomer.email || '',
        customerPhone: existingCustomer.phone || '',
        customerPhoneSecondary: existingCustomer.phoneSecondary || '',
        customerAddress: {
          line1: existingCustomer.address?.line1 || '',
          line2: existingCustomer.address?.line2 || '',
          city: existingCustomer.address?.city || '',
          state: existingCustomer.address?.state || '',
          country: existingCustomer.address?.country || '',
          zipcode: existingCustomer.address?.zipcode || '',
        },
        hasBusiness: existingCustomer.businessName ? 'yes' : 'no',
        businessName: existingCustomer.businessName || '',
      });
    } else {
      // Clear fields if user says no, but keep the phone number they typed
      form.setValue('customerName', '');
      form.setValue('customerEmail', '');
      form.setValue('customerPhoneSecondary', '');
      form.setValue('customerAddress', { line1: '', line2: '', city: '', state: '', country: '', zipcode: '' });
      form.setValue('businessName', '');
      form.setValue('hasBusiness', 'no');
    }
    setExistingCustomer(null);
  };

  return (
    <>
    <div className="p-4 sm:p-6 bg-[#e9f0f7] min-h-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          
          <Card className="bg-white">
                <CardHeader className="flex flex-row items-center justify-between p-2 bg-blue-100 border-b border-blue-200 rounded-t-lg">
                    <div className="flex items-center gap-2">
                        <FilePlus className="h-5 w-5 text-blue-700" />
                        <CardTitle className="text-sm font-semibold text-blue-700">Create New work Item</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            onClick={() => form.setValue('assignTo', 'myself')}
                            variant={assignment === 'myself' ? 'default' : 'outline'}
                            className={cn("h-8 text-xs", assignment === 'myself' ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-white text-blue-600 border-blue-600 hover:bg-blue-50")}
                        >
                            <UserCheck className="mr-2 h-4 w-4" />
                            Assign to Myself
                        </Button>
                        <Button
                            type="button"
                            onClick={() => form.setValue('assignTo', 'initial_indexing')}
                            variant={assignment === 'initial_indexing' ? 'default' : 'outline'}
                            className={cn("h-8 text-xs", assignment === 'initial_indexing' ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-white text-orange-500 border-orange-500 hover:bg-orange-50")}
                        >
                            <Users className="mr-2 h-4 w-4" />
                            Initial Indexing Queue
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="grid grid-cols-3 gap-4">
                        <FormField control={form.control} name="process" render={({ field }) => (
                            <FormItem>
                                 <FormLabel>Process *</FormLabel>
                                <Select onValueChange={(value) => { field.onChange(value); setSelectedTasks([]); }} value={field.value}>
                                    <FormControl><SelectTrigger className="h-7"><SelectValue placeholder="Select a process" /></SelectTrigger></FormControl>
                                    <SelectContent>{processTypes.map((type) => (<SelectItem key={type} value={type} className="text-xs">{type}</SelectItem>))}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <FormField
                            control={form.control}
                            name="initialTasks"
                            render={() => (
                            <FormItem>
                                <FormLabel>Initial Tasks</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" disabled={!selectedProcess} className={cn("w-full justify-between h-7 text-xs", !selectedTasks.length && "text-muted-foreground")}>
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
                                            <CommandItem className="text-xs" key={task} onSelect={() => { const isSelected = selectedTasks.includes(task); setSelectedTasks(isSelected ? selectedTasks.filter(t => t !== task) : [...selectedTasks, task]); }}>
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
                            )}
                        />
                         <FormField control={form.control} name="leadType" render={({ field }) => (
                            <FormItem>
                                 <FormLabel>Lead Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="h-7"><SelectValue placeholder="Select a lead type" /></SelectTrigger></FormControl>
                                    <SelectContent>{leadTypes.map((type) => (<SelectItem key={type} value={type} className="text-xs">{type}</SelectItem>))}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="space-y-4">
                    <Card className="bg-white">
                        <CardHeader className="p-2 bg-red-100 border-b border-red-200 rounded-t-lg">
                          <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-red-600" />
                            <CardTitle className="text-sm font-semibold text-red-600">Contact Information</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 grid grid-cols-2 gap-x-4 gap-y-2">
                            <FormField control={form.control} name="customerName" render={({ field }) => (<FormItem><FormLabel>Customer Name *</FormLabel><FormControl><Input {...field} className="h-7" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="customerEmail" render={({ field }) => (<FormItem><FormLabel>Customer Email</FormLabel><FormControl><Input {...field} className="h-7" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField
                                control={form.control}
                                name="customerPhone"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Customer Phone *</FormLabel>
                                    <div className="flex items-center">
                                      <div className="border border-r-0 border-input rounded-l-md bg-slate-50 h-7 px-3 flex items-center text-sm text-muted-foreground">+91</div>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          className="rounded-l-none h-7" 
                                          onBlur={(e) => {
                                            field.onBlur();
                                            checkForExistingCustomer(e.target.value);
                                          }}
                                        />
                                      </FormControl>
                                    </div>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="customerPhoneSecondary"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Secondary Phone</FormLabel>
                                     <div className="flex items-center">
                                      <div className="border border-r-0 border-input rounded-l-md bg-slate-50 h-7 px-3 flex items-center text-sm text-muted-foreground">+91</div>
                                      <FormControl>
                                        <Input {...field} className="rounded-l-none h-7" />
                                      </FormControl>
                                    </div>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="col-span-2 grid grid-cols-3 gap-2">
                                <FormField control={form.control} name="customerAddress.line1" render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} className="h-7" /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="customerAddress.city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} className="h-7" /></FormControl><FormMessage /></FormItem>)} />
                                 <FormField control={form.control} name="customerAddress.zipcode" render={({ field }) => (<FormItem><FormLabel>Pin Code</FormLabel><FormControl><Input {...field} className="h-7" /></FormControl><FormMessage /></FormItem>)} />
                             </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    <Card className="bg-white">
                        <CardHeader className="p-2 bg-orange-100 border-b border-orange-200 rounded-t-lg">
                          <div className="flex items-center gap-2">
                            <FilePlus className="h-5 w-5 text-orange-600" />
                            <CardTitle className="text-sm font-semibold text-orange-600">Overview / Description</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                             <div className="grid grid-cols-2 items-center gap-4">
                                <FormField control={form.control} name="hasBusiness" render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel>Customer Has Business?</FormLabel>
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4">
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl><RadioGroupItem value="yes" /></FormControl>
                                                    <FormLabel className="font-normal">Yes</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl><RadioGroupItem value="no" /></FormControl>
                                                    <FormLabel className="font-normal">No</FormLabel>
                                                </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                    </FormItem>
                                )} />
                                {hasBusiness === 'yes' && (
                                    <FormField control={form.control} name="businessName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Business / Company Name</FormLabel>
                                            <FormControl><Input {...field} className="h-7" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                )}
                             </div>
                             <FormField control={form.control} name="overview" render={({ field }) => (
                                <FormItem>
                                    <FormControl><Textarea placeholder="Provide a detailed description of the work item..." {...field} className="min-h-[140px] text-sm" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </CardContent>
                    </Card>
                </div>
            </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting} className="h-7">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isCheckingPhone} className="bg-orange-500 hover:bg-orange-600 text-white h-7">
              {isSubmitting ? 'Creating...' : (isCheckingPhone ? 'Checking...' : 'Create Work Item')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
    
    <AlertDialog open={!!existingCustomer} onOpenChange={(open) => !open && handleAlertClose(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Existing Customer Found</AlertDialogTitle>
            <div className="text-sm text-muted-foreground space-y-2">
                <div>This mobile number is already associated with an existing customer:</div>
                <div className="font-medium text-foreground mt-2">
                  <div>Name: {existingCustomer?.name}</div>
                  <div>Unique ID: {existingCustomer?.customerUniqueId}</div>
                </div>
                <div>Do you want to continue with this customer's information?</div>
            </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleAlertClose(false)}>No, enter a different number</AlertDialogCancel>
          <AlertDialogAction onClick={() => handleAlertClose(true)}>Yes, continue with this customer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );

    
}
