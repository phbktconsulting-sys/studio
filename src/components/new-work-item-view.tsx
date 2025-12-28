
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { NewWorkItemFullSchema, type NewWorkItemFullValues } from '@/lib/types';
import { createWorkItem } from '@/ai/flows/create-work-item-flow';
import { ArrowLeft, ChevronsUpDown, X, User, Info, DollarSign, FileText, Phone, Plus, Banknote } from 'lucide-react';
import { useState } from 'react';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { format } from 'date-fns';
import { CustomCalendar } from './custom-calendar';

const SectionHeader = ({ title, icon }: { title: string; icon: React.ReactNode }) => (
    <div className="flex items-center gap-2 -mx-4 -mt-4 mb-4 px-3 py-1.5 rounded-t-lg bg-[hsl(var(--section-header-bg))] text-[hsl(var(--section-header-fg))]">
        {icon}
        <h3 className="font-semibold text-sm">{title}</h3>
    </div>
);


export function NewWorkItemView() {
  const { user } = useFirebase();
  const { closeTab } = useTabs();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<NewWorkItemFullValues>({
    resolver: zodResolver(NewWorkItemFullSchema),
    defaultValues: {
      customerName: '',
      customerType: 'Regular',
      potential: '',
      industry: '',
      country: 'Dubai',
      state: '',
      city: '',
      purchaserName: '',
      purchaserPhone: '',
      purchaserEmail: '',
      accountName: '',
      accountPhone: '',
      accountEmail: '',
      taxId: '',
      creditLimit: '',
      paymentTerms: 'Electrical',
      outstandingBal: '',
      currency: '',
      paymentInfo: 'Default Payment term',
      inquireNumber: '',
      location: '',
      quotationDate: new Date(),
      quotationValidity: new Date(),
      billingAddress: '',
      shippingAddress: '',
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const onSubmit = async (data: NewWorkItemFullValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    setIsSubmitting(true);
    
    // This is a simplified mapping. In a real app, you'd have a more robust way
    // to determine process, urgency, assignedTo etc. from the form data.
    const payload = {
        process: 'Request Quotation', // Example, derived from context
        urgency: 'Medium',
        assignedTo: user.uid, // Assign to self for now
        createdBy: user.uid,
        relatedContact: {
            name: data.customerName,
            email: data.purchaserEmail, // Using purchaser email as primary
            phone: data.purchaserPhone,
        },
        overview: `Quotation for Inquire Number: ${data.inquireNumber}`,
        tasks: data.items.map(item => ({
            id: `task-${Date.now()}-${Math.random()}`,
            text: `Prepare item: ${item.item}`,
            completed: false,
        })),
        // You would also map other relevant fields from `data` to your WorkItem structure here
    };

    try {
        const result = await createWorkItem(payload);
        if (result.id && result.customId) {
            toast({
                title: 'Work Item Created',
                description: `Work Item ${result.customId} has been successfully created.`,
            });
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
    <div className="p-4 sm:p-6 bg-slate-50 min-h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
            </Button>
            <div>
            <h1 className="font-headline text-lg font-bold tracking-tight">Create New Quotation</h1>
            <p className="text-xs text-muted-foreground">Fill out the details below.</p>
            </div>
        </div>
        <Button type="submit" form="new-work-item-form" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </div>
      
      <Form {...form}>
        <form id="new-work-item-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 border rounded-lg bg-white shadow-sm">
                            <SectionHeader title="Customer Information" icon={<Info className="w-4 h-4" />} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-xs">
                                <FormField control={form.control} name="customerName" render={({ field }) => (<FormItem><FormLabel>Customer Name</FormLabel><FormControl><Input {...field} className="h-7 mt-1"/></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="customerType" render={({ field }) => (<FormItem><FormLabel>Customer ID</FormLabel><FormControl><Input {...field} className="h-7 mt-1" disabled /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="customerType" render={({ field }) => (<FormItem><FormLabel>Customer Type</FormLabel><FormControl><Input {...field} className="h-7 mt-1"/></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="potential" render={({ field }) => (<FormItem><FormLabel>Potential</FormLabel><FormControl><Input {...field} placeholder="e.g. A,B,C,D" className="h-7 mt-1"/></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="industry" render={({ field }) => (<FormItem><FormLabel>Industry</FormLabel><FormControl><Input {...field} className="h-7 mt-1"/></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="country" render={({ field }) => (<FormItem><FormLabel>Country</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger className="h-7 mt-1"><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent><SelectItem value="Dubai">Dubai</SelectItem></SelectContent>
                                    </Select>
                                <FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="state" render={({ field }) => (<FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} placeholder="e.g ABG12134567" className="h-7 mt-1"/></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} placeholder="e.g ABG12134567" className="h-7 mt-1"/></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </div>

                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 border rounded-lg bg-[hsl(var(--contact-info-bg))] border-[hsl(var(--contact-info-border))] shadow-sm">
                                <div className="flex justify-between items-center -mx-4 -mt-4 mb-4 px-3 py-1.5 rounded-t-lg bg-[hsl(var(--contact-info-header-bg))] text-white">
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4" />
                                        <h3 className="font-semibold text-sm">Contact Information</h3>
                                    </div>
                                    <Button type="button" variant="link" className="text-white h-auto p-0 text-xs"><Plus className="w-3 h-3 mr-1"/>Add New Contact</Button>
                                </div>
                                <div className="space-y-2 text-xs">
                                     <FormField control={form.control} name="purchaserName" render={({ field }) => (<FormItem><FormLabel>Select a Purchaser</FormLabel><Select onValueChange={field.onChange}><FormControl><SelectTrigger className="h-7 mt-1 bg-white"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Aleem">Aleem</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                     <div className="grid grid-cols-2 gap-2">
                                        <FormField control={form.control} name="purchaserPhone" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} className="h-7 mt-1 bg-white"/></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="purchaserEmail" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} className="h-7 mt-1 bg-white"/></FormControl><FormMessage /></FormItem>)} />
                                     </div>
                                     <FormField control={form.control} name="accountName" render={({ field }) => (<FormItem><FormLabel>Select Accounts</FormLabel><Select onValueChange={field.onChange}><FormControl><SelectTrigger className="h-7 mt-1 bg-white"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Aleem">Aleem</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                     <div className="grid grid-cols-2 gap-2">
                                        <FormField control={form.control} name="accountPhone" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} className="h-7 mt-1 bg-white"/></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="accountEmail" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} className="h-7 mt-1 bg-white"/></FormControl><FormMessage /></FormItem>)} />
                                     </div>
                                </div>
                            </div>
                             <div className="p-4 border rounded-lg bg-white shadow-sm">
                                <SectionHeader title="Payment Information" icon={<Banknote className="w-4 h-4" />} />
                                <div className="space-y-2 text-xs">
                                    <div className="grid grid-cols-2 gap-2">
                                        <FormField control={form.control} name="taxId" render={({ field }) => (<FormItem><FormLabel>TAX ID/VAT NO</FormLabel><FormControl><Input {...field} className="h-7 mt-1"/></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="creditLimit" render={({ field }) => (<FormItem><FormLabel>Credit Limit</FormLabel><FormControl><Input {...field} className="h-7 mt-1"/></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="paymentTerms" render={({ field }) => (<FormItem><FormLabel>Payment Terms</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger className="h-7 mt-1"><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent><SelectItem value="Electrical">Electrical</SelectItem></SelectContent>
                                            </Select>
                                        <FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="outstandingBal" render={({ field }) => (<FormItem><FormLabel>Outstanding Bal</FormLabel><FormControl><Input {...field} className="h-7 mt-1"/></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="currency" render={({ field }) => (<FormItem><FormLabel>Currency</FormLabel><Select onValueChange={field.onChange}><FormControl><SelectTrigger className="h-7 mt-1"><SelectValue placeholder="Select Currency"/></SelectTrigger></FormControl><SelectContent></SelectContent></Select><FormMessage /></FormItem>)} />
                                    </div>
                                    <div className="space-y-1 pt-1">
                                        <Label>Payment Info:</Label>
                                        <div className="flex items-center gap-4">
                                            <FormField control={form.control} name="paymentInfo" render={({ field }) => (<FormItem className="flex items-center gap-2"><FormControl><Checkbox checked={field.value === 'Default Payment term'} onCheckedChange={(checked) => field.onChange(checked ? 'Default Payment term' : '')} /></FormControl><FormLabel className="font-normal">Default Payment term</FormLabel></FormItem>)} />
                                            <FormField control={form.control} name="paymentInfo" render={({ field }) => (<FormItem className="flex items-center gap-2"><FormControl><Checkbox checked={field.value === 'Cash'} onCheckedChange={(checked) => field.onChange(checked ? 'Cash' : '')} /></FormControl><FormLabel className="font-normal">Cash</FormLabel></FormItem>)} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                     <div className="p-4 border rounded-lg bg-white shadow-sm">
                        <SectionHeader title="Quote Information" icon={<FileText className="w-4 h-4" />} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                             <FormField control={form.control} name="inquireNumber" render={({ field }) => (<FormItem><FormLabel>Inquire Number/REF</FormLabel><FormControl><Input {...field} className="h-7 mt-1"/></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="location" render={({ field }) => (<FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} className="h-7 mt-1"/></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="quotationDate" render={({ field }) => (<FormItem><FormLabel>Quotation Date</FormLabel><CustomCalendar value={field.value} onChange={field.onChange} /><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="quotationValidity" render={({ field }) => (<FormItem><FormLabel>Quotation Validity</FormLabel><CustomCalendar value={field.value} onChange={field.onChange} /><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="billingAddress" render={({ field }) => (<FormItem className="sm:col-span-2"><FormLabel>Billing Address</FormLabel><FormControl><Input {...field} className="h-7 mt-1"/></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="shippingAddress" render={({ field }) => (<FormItem className="sm:col-span-2"><FormLabel>Shipping Address</FormLabel><FormControl><Input {...field} className="h-7 mt-1"/></FormControl><FormMessage /></FormItem>)} />
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                    <div className="p-4 border rounded-lg bg-white shadow-sm text-xs">
                        <div className="grid grid-cols-2 gap-4">
                            <FormItem><FormLabel>Status</FormLabel><FormControl><Input readOnly value="Open" className="h-7 mt-1 bg-slate-100"/></FormControl></FormItem>
                            <FormItem><FormLabel>Save Source</FormLabel><FormControl><Input readOnly value="Web" className="h-7 mt-1 bg-slate-100"/></FormControl></FormItem>
                            <FormItem><FormLabel>Created By</FormLabel><FormControl><Input readOnly value={user?.displayName || ''} className="h-7 mt-1 bg-slate-100"/></FormControl></FormItem>
                            <FormItem><FormLabel>Department</FormLabel><FormControl><Input readOnly value={user?.department || 'N/A'} className="h-7 mt-1 bg-slate-100"/></FormControl></FormItem>
                        </div>
                    </div>
                    <div className="p-4 border rounded-lg bg-orange-50 border-orange-200 shadow-sm text-sm">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-slate-600"><p>Subtotal</p><p>€0.00</p></div>
                            <div className="flex justify-between items-center text-slate-600"><p>Discount Item</p><p>0%</p></div>
                            <div className="flex justify-between items-center text-slate-600"><p>Tax Total</p><p>€0.00</p></div>
                            <div className="flex justify-between items-center font-bold text-base border-t border-orange-200 pt-2 mt-2"><p>Total</p><p>€0.00</p></div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Item Details Table */}
            <div className="p-4 border rounded-lg bg-white shadow-sm">
                 <SectionHeader title="Item Details" icon={<DollarSign className="w-4 h-4" />} />
                 <div className="overflow-x-auto">
                    {/* Table will go here */}
                 </div>
            </div>
        </form>
      </Form>
    </div>
  );
}
