'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { WorkItem, QuotationFormValues, QuotationTask } from '@/lib/types';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { QuotationFormSchema } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Trash2, PlusCircle, Loader2, ChevronsUpDown, X } from 'lucide-react';
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { cn } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { QuotationPrintTemplate } from './quotation-print-template';
import type { createRoot } from 'react-dom/client';
import type jsPDF from 'jspdf';
import type html2canvas from 'html2canvas';

const processTaskMap: Record<string, string[]> = {
    "New Business Request": ["Request Inmation & Quotation", "Request Website Development", "Request Mobile App Development", "Request Digital Marketing", "Request Meeting/Consultation", "Request Backend Support", "Request Graphic Design", "Request SEO Services", "Request Product Demo", "Request Project Proposal", "Request Maintenance Contract (AMC)", "Request Domain & Hosting", "Request Content Writing", "Request E-commerce Solution", "Request Automation & Micros", "Request Custom Software", "Request Urgent Repair (New Client)", "Request Callback", "Request Call for New Lead", "Request Other Services"],
    "Development Services (Web & App)": ["New Corporate Website Build", "New E-Commerce Store Build", "Android App Development", "IOS App Development", "Hybrid App Development", "Excel Automation Micros", "CRM / ERP System Development", "Landing Page Creation", "Website Redesign Project", "Payment Gateway Integration", "API Development & Integration", "Admin Panel / Dashboard Build", "User Portal Development", "Chatbot Integration", "SaaS Platform Development", "Plugin / Extension Development", "UI/UX Design Mockups", "Database Structure Design", "Third-Party Tool Integration", "Website Speed Optimization"],
    "Operations & Support (Backend)": ["Server Down / Critical Issue", "Database Connection Error", "Fix Application Bug", "Restore Data form Backup", "Install SSL Certificate", "Migrate Server to Cloud", "Optimize Server Speed", "Update Security Patches", "Configure Firewalls", "Fix Email/SMTP Issues", "Resolve API Failure", "Clean Malware / Virus", "Update PHP/Node Version", "Manage User Permissions", "Setup Cron Jobs", "Review Error Logs", "DNS / Domain Configuration", "Hosting CPanel Support", "Automation Script Failure", "General Maintenance Task"],
    "Digital Services Request": ["Start SEO Campaign", "Start Google Ads (PPC)", "Start Facebook/Insta Ads", "Create Social Media Calendar", "Write Blog Content", "Design Marketing Graphics", "Setup Email Newsletter", "Create Promotional Video", "Manage LinkedIn Profile", "Setup Google Analytics", "Optimize Google My Business", "Manage Online Reviews", "Create Landing Page Copy", "Influencer Marketing Setup", "App Store Optimization (ASO)", "YouTube Channel Management", "Brand Identity Design", "Competitor Analysis Report", "Monthly Performance Report"],
    "Feedback / Complaint": ["Report a System Crash", "Report Slow Performance", "Report Login Issue", "Report Data Error", "Report UI/Design Flaw", "Complaint about Billing", "Complaint about Delay", "Complaint about Support Quality", "Complaint about Communication", "Suggest New Feature", "Suggest Design Change", "Suggest Process Improvement", "Escalation to Management", "Review: Positive Feedback", "Review: Negative Feedback", "Request for Refund", "Request for Contract Cancellation", "Report Security Concern", "Post-Project Feedback", "General Complaint"],
    "Other Service Request": ["Inquire about Invoice", "Inquire about Job Opening", "Inquire about Internship", "Inquire about Training", "Renew Domain Name", "Renew Hosting Plan", "Purchase Software License", "Update Company Details", "Request Tax Document", "Schedule Annual Review", "Vendor Sales Pitch", "Legal / Compliance Query", "Media / Press Inquiry", "Sponsorship Request", "Employee Referral", "Internal Admin Task", "Hardware Requirement", "Network Setup Request", "Office Visit Request", "Unclassified Request"]
};

const processTypes = Object.keys(processTaskMap);

interface QuotationTabProps {
  workItem: WorkItem;
}


export function QuotationTab({ workItem }: QuotationTabProps) {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  const [isGenerating, setIsGenerating] = useState(false);
  const [openPopovers, setOpenPopovers] = useState<Record<number, boolean>>({});
  const [entryFormKey, setEntryFormKey] = useState(0);

  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(QuotationFormSchema),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      customerBusinessName: '',
      customerAddress: '',
      tasks: [{ process: '', task: '', item: '', description: '', quantity: 0, unitPrice: 0 }],
    },
  });

  const { fields, append, remove, update, replace } = useFieldArray({
    control: form.control,
    name: 'tasks',
  });
  
  const quotationData = form.watch();
  const addedTasks = fields.slice(0, -1);
  const subtotal = addedTasks.reduce((acc, task) => acc + ((task.quantity || 0) * (task.unitPrice || 0)), 0);
  const tax = subtotal * 0.18;
  const grandTotal = subtotal + tax;
  const quoteNumber = `Q-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;


  useEffect(() => {
    if (workItem) {
      const fullAddress = workItem.relatedContact.address
        ? `${workItem.relatedContact.address.line1}, ${workItem.relatedContact.address.city}, ${workItem.relatedContact.address.state} ${workItem.relatedContact.address.zipcode}`
        : '';
      
      form.reset({
        customerName: workItem.relatedContact.name || '',
        customerPhone: workItem.relatedContact.phone || '',
        customerBusinessName: workItem.relatedContact.businessName || '',
        customerAddress: fullAddress,
        tasks: [{ process: '', task: '', item: '', description: '', quantity: 0, unitPrice: 0 }],
      });
      setEntryFormKey(prev => prev + 1);
    }
  }, [workItem, form]);


  const handleGenerateQuote = async (data: QuotationFormValues) => {
    if (!firestore || !user) {
        toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
        return;
    }
    
    const finalTasks = data.tasks.filter(task => !!task.process && !!task.task && !!task.item && task.quantity && task.quantity > 0);

    if (finalTasks.length === 0) {
        toast({ variant: "destructive", title: "Error", description: "Please add at least one complete line item to the quotation." });
        return;
    }
    const finalQuotationData = { ...data, tasks: finalTasks as QuotationTask[] };

    setIsGenerating(true);

    try {
        const jsPDF = (await import('jspdf')).default;
        const html2canvas = (await import('html2canvas')).default;
        const { createRoot } = (await import('react-dom/client'));

        const printContainer = document.createElement('div');
        printContainer.style.position = 'absolute';
        printContainer.style.left = '-9999px';
        document.body.appendChild(printContainer);

        const root = createRoot(printContainer);

        const subtotal = finalTasks.reduce((acc, task) => acc + ((task.quantity || 0) * (task.unitPrice || 0)), 0);
        const tax = subtotal * 0.18;
        const grandTotal = subtotal + tax;

        root.render(
            <QuotationPrintTemplate quotation={finalQuotationData} subtotal={subtotal} tax={tax} grandTotal={grandTotal} quoteNumber={quoteNumber} />
        );
        
        setTimeout(async () => {
            const input = document.getElementById('quotation-to-print');
            if (!input) {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not find quotation template to print.' });
                setIsGenerating(false);
                return;
            }

            try {
                const canvas = await html2canvas(input, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                
                const fileName = `Quotation_${quoteNumber}.pdf`;
                pdf.save(fileName); 

                const attachmentsRef = collection(firestore, 'work_items', workItem.id, 'attachments');
                const newAttachmentRef = doc(attachmentsRef);
                
                const attachmentData = {
                    id: newAttachmentRef.id,
                    workItemId: workItem.id,
                    url: '#downloaded-locally',
                    direction: 'Outbound',
                    fileName: fileName,
                    uploadedAt: new Date().toISOString(),
                    uploadedBy: user.uid,
                    type: 'QUOTE',
                    documentSource: 'System',
                    businessEvent: 'QUOTATION',
                    quotationData: finalQuotationData, 
                };
                
                await setDoc(newAttachmentRef, attachmentData);

                toast({
                    title: 'Quotation Generated & Logged',
                    description: 'The PDF has been downloaded and a record has been saved to attachments.',
                });
            } catch (e) {
                console.error("Failed to generate PDF canvas:", e);
                toast({ variant: 'destructive', title: 'Generation Failed', description: 'Could not create PDF content.' });
            } finally {
                root.unmount();
                document.body.removeChild(printContainer);
                setIsGenerating(false);
            }
        }, 200); 

    } catch (error: any) {
        console.error("Failed to generate or log quotation:", error);
        toast({
            variant: 'destructive',
            title: 'Generation Failed',
            description: error.message || 'An unexpected error occurred.',
        });
        setIsGenerating(false);
    }
  };
  
  return (
      <div className="p-4 space-y-6">
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
             <QuotationPrintTemplate quotation={{...quotationData, tasks: addedTasks.map(t => t as any)}} subtotal={subtotal} tax={tax} grandTotal={grandTotal} quoteNumber={quoteNumber} />
        </div>
        <Card>
          <CardContent className="p-6">
            <Form {...form}>
              <form id="quotation-form" onSubmit={form.handleSubmit(handleGenerateQuote)} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b pb-6">
                    <div className="md:col-span-1 pt-1.5">
                        <FormLabel className="text-xs font-semibold">Customer Details</FormLabel>
                    </div>
                    <div className="md:col-span-3 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="customerName"
                                render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                    <Input {...field} placeholder="Customer Name" className="text-xs h-8" />
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
                                    <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <span className="text-gray-500 sm:text-sm">+91</span>
                                    </div>
                                    <FormControl>
                                        <Input {...field} placeholder="Customer Phone" className="pl-12 text-xs h-8" />
                                    </FormControl>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="customerBusinessName"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input {...field} placeholder="Business Name (Optional)" className="text-xs h-8" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="customerAddress"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input {...field} placeholder="Customer Address" className="text-xs h-8" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-1 pt-1.5">
                    <FormLabel className="text-xs font-semibold">Line Items</FormLabel>
                  </div>

                  <div className="md:col-span-3 space-y-4" key={entryFormKey}>
                     <div className="grid grid-cols-12 gap-2 items-start rounded-md">
                          <div className="col-span-3">
                             <FormField
                              control={form.control}
                              name={`tasks.${fields.length - 1}.process`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Process</FormLabel>
                                   <Select 
                                    onValueChange={(value) => {
                                        field.onChange(value);
                                        update(fields.length - 1, { ...form.getValues(`tasks.${fields.length - 1}`), task: '', item: '', description: '' });
                                    }} 
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger className='text-xs h-8'>
                                        <SelectValue placeholder="Select Process" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {processTypes.map((proc) => (
                                        <SelectItem key={proc} value={proc}>{proc}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="col-span-4">
                             <FormField
                                control={form.control}
                                name={`tasks.${fields.length - 1}.task`}
                                render={({ field: taskField }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Task</FormLabel>
                                    <Popover open={openPopovers[fields.length - 1]} onOpenChange={(isOpen) => setOpenPopovers(prev => ({...prev, [fields.length - 1]: isOpen}))}>
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant="outline"
                                            role="combobox"
                                            disabled={!form.watch(`tasks.${fields.length - 1}.process`)}
                                            className={cn("w-full justify-between text-xs h-8", !taskField.value && "text-muted-foreground")}
                                          >
                                            {taskField.value ? taskField.value : "Select Task"}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                          </Button>
                                        </FormControl>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                          <CommandInput placeholder="Search task..." />
                                          <CommandList>
                                              <CommandEmpty>No tasks found.</CommandEmpty>
                                              <CommandGroup>
                                              {(processTaskMap[form.watch(`tasks.${fields.length - 1}.process`) || ''] || []).map((task) => (
                                                  <CommandItem
                                                  value={task}
                                                  key={task}
                                                  onSelect={() => {
                                                      update(fields.length - 1, { ...form.getValues(`tasks.${fields.length - 1}`), task: task, item: task, description: task });
                                                      setOpenPopovers(prev => ({...prev, [fields.length - 1]: false}));
                                                  }}
                                                  >
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
                          </div>

                          <div className="col-span-1">
                            <FormField
                              control={form.control}
                              name={`tasks.${fields.length - 1}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Qty</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      {...field}
                                      value={field.value || ''}
                                      onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                      className="text-xs h-8"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="col-span-2">
                            <FormField
                              control={form.control}
                              name={`tasks.${fields.length - 1}.unitPrice`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Unit Price</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      {...field}
                                      value={field.value || ''}
                                       onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                      className="text-xs h-8"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                           <div className="col-span-2">
                             <FormLabel className='text-xs'>Total</FormLabel>
                             <div className="h-8 flex items-center text-xs font-medium">
                              ₹{((form.watch(`tasks.${fields.length - 1}.quantity`) || 0) * (form.watch(`tasks.${fields.length - 1}.unitPrice`) || 0)).toLocaleString()}
                             </div>
                           </div>
                        </div>
                         <div className="flex justify-end">
                            <Button type="button" variant="outline" size="sm" onClick={() => {
                                append({ process: '', task: '', item: '', description: '', quantity: 0, unitPrice: 0 });
                                setEntryFormKey(prev => prev + 1);
                                }} className="h-8">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                            </Button>
                        </div>
                        <div className="w-full border-b border-green-600 my-4" />
                  </div>
                </div>
                
                 {addedTasks.length > 0 && (
                    <div className="mt-6 space-y-2 pt-4">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead className='text-xs'>Description</TableHead>
                            <TableHead className='w-[80px] text-center text-xs'>Quantity</TableHead>
                            <TableHead className='w-[120px] text-right text-xs'>Unit Price</TableHead>
                            <TableHead className='w-[120px] text-right text-xs'>Total</TableHead>
                            <TableHead className='w-[50px]'></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {fields.slice(0, -1).map((field, index) => (
                            <TableRow key={field.id}>
                                <TableCell className='py-2'>
                                <p className="font-medium text-xs">{field.item}</p>
                                <p className="text-muted-foreground text-xs">{field.description}</p>
                                </TableCell>
                                <TableCell className='text-center text-xs py-2'>{field.quantity}</TableCell>
                                <TableCell className='text-right text-xs py-2'>₹{(field.unitPrice || 0).toLocaleString()}</TableCell>
                                <TableCell className='text-right text-xs py-2'>₹{((field.quantity || 0) * (field.unitPrice || 0)).toLocaleString()}</TableCell>
                                <TableCell className='py-2'>
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-7 w-7">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                        </Table>
                    </div>
                )}
                 <div className="flex justify-end mt-4">
                    <div className="w-1/3 text-xs space-y-1">
                        <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Tax (18% GST):</span>
                            <span>₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between font-bold text-sm pt-1 border-t">
                            <span>Grand Total:</span>
                            <span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
                 <div className="flex justify-end pt-4">
                  <Button form="quotation-form" type="submit" disabled={isGenerating} className="h-8">
                    {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isGenerating ? 'Generating...' : 'Generate Quotation'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
  );
}
