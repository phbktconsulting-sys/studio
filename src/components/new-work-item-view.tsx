
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
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
import { NewWorkItemFullSchema, type NewWorkItemFullFormValues } from '@/lib/types';
import { createWorkItem } from '@/ai/flows/create-work-item-flow';
import { ArrowLeft, Plus, PlusCircle, Trash2, Info, FilePen, Banknote, FileText, User as UserIcon, Building, Phone, Mail, ShoppingCart, Truck, DollarSign } from 'lucide-react';
import { useState } from 'react';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

const SectionHeader = ({ title, icon, colorClass }: { title: string; icon: React.ReactNode; colorClass: string }) => (
  <div className={`flex items-center gap-2 rounded-t-md px-3 py-1.5 text-sm font-semibold text-white ${colorClass}`}>
    {icon}
    {title}
  </div>
);


export function NewWorkItemView() {
  const { user } = useFirebase();
  const { closeTab } = useTabs();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<NewWorkItemFullFormValues>({
    resolver: zodResolver(NewWorkItemFullSchema),
    defaultValues: {
      customerName: '',
      customerType: 'Regular',
      potential: '',
      industry: '',
      country: '',
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
      outstandingBalance: '',
      currency: '',
      defaultPaymentTerm: true,
      cashPayment: false,

      inquireNumber: '',
      location: '',
      quotationDate: '',
      quotationValidity: '',
      billingAddress: '',
      shippingAddress: '',

      items: [{
        customerPartNo: '',
        item: '',
        brand: '',
        origin: '',
        quantity: 0,
        unitPrice: 0,
        tax: 0,
        weight: 0,
        hsCode: '',
      }],
      discount: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });
  
  const watchedItems = useWatch({
    control: form.control,
    name: 'items'
  });
  const watchedDiscount = useWatch({
    control: form.control,
    name: 'discount'
  });

  const totals = watchedItems.reduce((acc, item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const taxPercent = Number(item.tax) || 0;
    
    const amount = quantity * unitPrice;
    const taxAmount = amount * (taxPercent / 100);
    
    acc.subtotal += amount;
    acc.totalTax += taxAmount;
    acc.totalQuantity += quantity;
    return acc;
  }, { subtotal: 0, totalTax: 0, totalQuantity: 0 });

  const discountAmount = totals.subtotal * ((Number(watchedDiscount) || 0) / 100);
  const grandTotal = totals.subtotal - discountAmount + totals.totalTax;


  const onSubmit = async (data: NewWorkItemFullFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    setIsSubmitting(true);
    
    // This is where you would map the new detailed form to the existing `createWorkItem` payload.
    // For now, it will just display a success and close.
    console.log("Form Data Submitted:", data);

    // Mocking a successful creation for demonstration purposes.
    // Replace this with the actual `createWorkItem` call with the mapped data.
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({
        title: 'Work Item Created (Mock)',
        description: `The new work item has been successfully created.`,
    });
    closeTab('new-work-item');
        
    setIsSubmitting(false);
  };

  const handleCancel = () => {
    closeTab('new-work-item');
  };
  
  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-full">
      <Form {...form}>
        <form id="new-work-item-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                    {/* Customer, Contact, Payment */}
                    <Card className="shadow-sm">
                        <SectionHeader title="Customer Information" icon={<Info className="h-4 w-4" />} colorClass="bg-[hsl(var(--section-header-blue))]" />
                        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <FormField control={form.control} name="customerName" render={({ field }) => (<FormItem><FormLabel>Customer Name</FormLabel><FormControl><Input {...field} className="h-8 mt-1" /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="customerType" render={({ field }) => (<FormItem><FormLabel>Customer ID</FormLabel><FormControl><Input {...field} className="h-8 mt-1" readOnly value="Regular"/></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="customerType" render={({ field }) => (<FormItem><FormLabel>Customer Type</FormLabel><FormControl><Input {...field} className="h-8 mt-1" /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="potential" render={({ field }) => (<FormItem><FormLabel>Potential</FormLabel><FormControl><Input {...field} className="h-8 mt-1" /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="industry" render={({ field }) => (<FormItem><FormLabel>Industry</FormLabel><FormControl><Input {...field} className="h-8 mt-1" /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="country" render={({ field }) => (<FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} className="h-8 mt-1" /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="state" render={({ field }) => (<FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} className="h-8 mt-1" /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} className="h-8 mt-1" /></FormControl><FormMessage /></FormItem>)} />
                        </CardContent>
                    </Card>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="shadow-sm border-[hsl(var(--contact-info-border))]">
                            <SectionHeader title="Contact Information" icon={<FilePen className="h-4 w-4" />} colorClass="bg-[hsl(var(--contact-info-border))]" />
                            <CardContent className="p-4 space-y-4 text-xs bg-[hsl(var(--contact-info-bg))] rounded-b-md">
                                <div className="space-y-1">
                                    <Label>Select a Purchaser</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <FormField control={form.control} name="purchaserName" render={({ field }) => (<FormItem className="col-span-1"><FormControl><Input {...field} placeholder="Name" className="h-8" /></FormControl></FormItem>)} />
                                        <FormField control={form.control} name="purchaserPhone" render={({ field }) => (<FormItem className="col-span-1"><FormControl><Input {...field} placeholder="Phone" className="h-8" /></FormControl></FormItem>)} />
                                        <FormField control={form.control} name="purchaserEmail" render={({ field }) => (<FormItem className="col-span-1"><FormControl><Input {...field} placeholder="Email" className="h-8" /></FormControl></FormItem>)} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label>Select Accounts</Label>
                                     <div className="grid grid-cols-3 gap-2">
                                        <FormField control={form.control} name="accountName" render={({ field }) => (<FormItem className="col-span-1"><FormControl><Input {...field} placeholder="Name" className="h-8" /></FormControl></FormItem>)} />
                                        <FormField control={form.control} name="accountPhone" render={({ field }) => (<FormItem className="col-span-1"><FormControl><Input {...field} placeholder="Phone" className="h-8" /></FormControl></FormItem>)} />
                                        <FormField control={form.control} name="accountEmail" render={({ field }) => (<FormItem className="col-span-1"><FormControl><Input {...field} placeholder="Email" className="h-8" /></FormControl></FormItem>)} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm">
                            <SectionHeader title="Payment Information" icon={<Banknote className="h-4 w-4" />} colorClass="bg-[hsl(var(--section-header-blue))]" />
                             <CardContent className="p-4 grid grid-cols-2 gap-4 text-xs">
                                <FormField control={form.control} name="taxId" render={({ field }) => (<FormItem><FormLabel>TAX ID/VAT NO</FormLabel><FormControl><Input {...field} className="h-8 mt-1" /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="creditLimit" render={({ field }) => (<FormItem><FormLabel>Credit Limit</FormLabel><FormControl><Input {...field} className="h-8 mt-1" /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="paymentTerms" render={({ field }) => (<FormItem><FormLabel>Payment Terms</FormLabel><FormControl><Input {...field} className="h-8 mt-1" /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="outstandingBalance" render={({ field }) => (<FormItem><FormLabel>Outstanding Bal</FormLabel><FormControl><Input {...field} className="h-8 mt-1" /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="currency" render={({ field }) => (<FormItem><FormLabel>Currency</FormLabel><FormControl><Input {...field} className="h-8 mt-1" /></FormControl></FormItem>)} />
                                <div className="col-span-2 space-y-2">
                                    <Label>Payment Info</Label>
                                    <div className="flex items-center gap-4">
                                        <FormField control={form.control} name="defaultPaymentTerm" render={({ field }) => (<FormItem className="flex items-center gap-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Default Payment term</FormLabel></FormItem>)} />
                                        <FormField control={form.control} name="cashPayment" render={({ field }) => (<FormItem className="flex items-center gap-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Cash</FormLabel></FormItem>)} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                     </div>
                     <Card>
                        <SectionHeader title="Quote Information" icon={<FileText className="h-4 w-4" />} colorClass="bg-[hsl(var(--section-header-blue))]" />
                        <CardContent className="p-4 grid grid-cols-2 gap-4 text-xs">
                            <FormField control={form.control} name="inquireNumber" render={({ field }) => (<FormItem><FormLabel>Inquire Number/REF</FormLabel><FormControl><Input {...field} className="h-8 mt-1" /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="location" render={({ field }) => (<FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} className="h-8 mt-1" /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="quotationDate" render={({ field }) => (<FormItem><FormLabel>Quotation Date</FormLabel><FormControl><Input {...field} type="date" className="h-8 mt-1" /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="quotationValidity" render={({ field }) => (<FormItem><FormLabel>Quotation Validity</FormLabel><FormControl><Input {...field} type="date" className="h-8 mt-1" /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="billingAddress" render={({ field }) => (<FormItem><FormLabel>Billing Address</FormLabel><FormControl><Input {...field} className="h-8 mt-1" /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="shippingAddress" render={({ field }) => (<FormItem><FormLabel>Shipping Address</FormLabel><FormControl><Input {...field} className="h-8 mt-1" /></FormControl></FormItem>)} />
                        </CardContent>
                     </Card>
                </div>
                {/* Right Summary Column */}
                <div className="space-y-4">
                    <Card>
                         <SectionHeader title="Details" icon={<Info className="h-4 w-4" />} colorClass="bg-[hsl(var(--section-header-blue))]" />
                         <CardContent className="p-4 space-y-3 text-xs">
                            <div className="flex justify-between items-center"><span className="font-medium">Status</span><span className="text-muted-foreground">Open</span></div>
                            <div className="flex justify-between items-center"><span className="font-medium">Save Source</span><span className="text-muted-foreground">Web</span></div>
                            <div className="flex justify-between items-center"><span className="font-medium">Created By</span><span className="text-muted-foreground">{user?.displayName}</span></div>
                            <div className="flex justify-between items-center"><span className="font-medium">Department</span><span className="text-muted-foreground">{user?.department || 'N/A'}</span></div>
                         </CardContent>
                    </Card>
                    <Card className="border-[hsl(var(--contact-info-border))]">
                        <CardContent className="p-4 space-y-2 text-sm bg-[hsl(var(--contact-info-bg))] rounded-md">
                            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{totals.subtotal.toFixed(2)}</span></div>
                            <div className="flex justify-between items-center">
                               <span className="text-muted-foreground">Discount Item</span>
                                <FormField control={form.control} name="discount" render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <div className="relative w-24">
                                            <Input type="number" {...field} className="h-7 text-xs pr-6" onChange={e => field.onChange(Number(e.target.value))}/>
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">%</span>
                                        </div>
                                    </FormControl>
                                </FormItem>
                                )}/>
                            </div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Tax Total</span><span>{totals.totalTax.toFixed(2)}</span></div>
                            <div className="flex justify-between font-bold text-lg"><span className="text-primary">Total</span><span className="text-primary">€{grandTotal.toFixed(2)}</span></div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            
             {/* Item Details Table */}
            <Card>
                <SectionHeader title="Item Details" icon={<ShoppingCart className="h-4 w-4"/>} colorClass="bg-[hsl(var(--section-header-blue))]" />
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table className="text-xs">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">S.I.No</TableHead>
                                    <TableHead>Customer Part no</TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Brand</TableHead>
                                    <TableHead>Origin</TableHead>
                                    <TableHead>QTY</TableHead>
                                    <TableHead>Unit Price</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Available QTY</TableHead>
                                    <TableHead>Lead Time</TableHead>
                                    <TableHead>Tax</TableHead>
                                    <TableHead>Tax Amount</TableHead>
                                    <TableHead>Weight</TableHead>
                                    <TableHead>HS Code</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => {
                                  const item = watchedItems[index] || {};
                                  const quantity = Number(item.quantity) || 0;
                                  const unitPrice = Number(item.unitPrice) || 0;
                                  const taxPercent = Number(item.tax) || 0;
                                  const amount = quantity * unitPrice;
                                  const taxAmount = amount * (taxPercent / 100);
                                  return (
                                    <TableRow key={field.id}>
                                      <TableCell>{index + 1}</TableCell>
                                      <TableCell><FormField control={form.control} name={`items.${index}.customerPartNo`} render={({ field }) => <Input {...field} className="h-7 w-28" />} /></TableCell>
                                      <TableCell><FormField control={form.control} name={`items.${index}.item`} render={({ field }) => <Input {...field} className="h-7 w-24" />} /></TableCell>
                                      <TableCell><FormField control={form.control} name={`items.${index}.brand`} render={({ field }) => <Input {...field} className="h-7 w-24" />} /></TableCell>
                                      <TableCell><FormField control={form.control} name={`items.${index}.origin`} render={({ field }) => <Input {...field} className="h-7 w-20" />} /></TableCell>
                                      <TableCell><FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => <Input type="number" {...field} className="h-7 w-16" onChange={e => field.onChange(Number(e.target.value))} />} /></TableCell>
                                      <TableCell><FormField control={form.control} name={`items.${index}.unitPrice`} render={({ field }) => <Input type="number" {...field} className="h-7 w-20" onChange={e => field.onChange(Number(e.target.value))} />} /></TableCell>
                                      <TableCell>{amount.toFixed(2)}</TableCell>
                                      <TableCell><Input readOnly className="h-7 w-20 bg-muted/50" /></TableCell>
                                      <TableCell><Input readOnly className="h-7 w-20 bg-muted/50" /></TableCell>
                                      <TableCell><FormField control={form.control} name={`items.${index}.tax`} render={({ field }) => <Input type="number" {...field} className="h-7 w-16" placeholder="%" onChange={e => field.onChange(Number(e.target.value))} />} /></TableCell>
                                      <TableCell>{taxAmount.toFixed(2)}</TableCell>
                                      <TableCell><FormField control={form.control} name={`items.${index}.weight`} render={({ field }) => <Input type="number" {...field} className="h-7 w-20" onChange={e => field.onChange(Number(e.target.value))} />} /></TableCell>
                                      <TableCell><FormField control={form.control} name={`items.${index}.hsCode`} render={({ field }) => <Input {...field} className="h-7 w-24" />} /></TableCell>
                                      <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-7 w-7"><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                                    </TableRow>
                                  )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                     <div className="flex items-center justify-between p-2 border-t bg-gray-50">
                        <div className="flex items-center gap-4">
                            <Button type="button" variant="outline" size="sm" className="h-7 text-xs">Product Search</Button>
                            <Select defaultValue="USD"><SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="INR">INR</SelectItem></SelectContent></Select>
                        </div>
                        <div className="flex items-center gap-4 text-sm font-medium">
                            <span>Total Line: {fields.length}</span>
                            <span>Total QTY: {totals.totalQuantity}</span>
                            <Button type="button" onClick={() => append({ customerPartNo: '', item: '', brand: '', origin: '', quantity: 0, unitPrice: 0, tax: 0, weight: 0, hsCode: '' })} size="sm" className="h-7 text-xs"><Plus className="h-4 w-4 mr-1"/>Add Item</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

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
