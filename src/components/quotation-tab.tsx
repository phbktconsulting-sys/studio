'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { WorkItem, QuotationFormValues } from '@/lib/types';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { QuotationFormSchema } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Trash2, PlusCircle, Loader2, ChevronsUpDown } from 'lucide-react';
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { cn } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';


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

export const QuotationPrintTemplate = ({ quotation, subtotal, tax, grandTotal, quoteNumber }: { quotation: QuotationFormValues, subtotal: number, tax: number, grandTotal: number, quoteNumber: string }) => (
    <div id="quotation-to-print" className="p-10" style={{ width: '800px', fontFamily: 'Inter, sans-serif', color: '#111827', backgroundColor: 'white', fontSize: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#6b7280', marginBottom: '20px' }}>
        <span>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}, {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
        <span>Business Quotation</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '15px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
           <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ height: '40px', width: '40px' }}>
              <g transform="translate(50,50)">
                <path d="M0,0 L0,-50 A50,50 0 0,1 50,0 Z" fill="hsl(173 58% 39%)" transform="rotate(0)"/>
                <path d="M0,0 L0,-50 A50,50 0 0,1 50,0 Z" fill="hsl(27 87% 67%)" transform="rotate(90)"/>
                <path d="M0,0 L0,-50 A50,50 0 0,1 50,0 Z" fill="hsl(0 100% 25%)" transform="rotate(180)"/>
                <path d="M0,0 L0,-50 A50,50 0 0,1 50,0 Z" fill="hsl(0 39% 47%)" transform="rotate(270)"/>
              </g>
            </svg>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#000', margin: 0 }}>PHBKT Group Limited</h1>
            <p style={{ margin: '2px 0', fontSize: '10px' }}>123 Business Road, Tech Park</p>
            <p style={{ margin: '2px 0', fontSize: '10px' }}>Pune, Maharashtra, 411057</p>
            <p style={{ margin: '2px 0', fontSize: '10px' }}>Email: contact@phbkt.com | Phone: +91 98765 43210</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ margin: '0 0 10px', fontSize: '24px', fontWeight: 700, color: '#374151' }}>QUOTATION</h2>
          <p style={{ margin: '2px 0', fontSize: '10px', fontWeight: 500 }}><strong>Date:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
          <p style={{ margin: '2px 0', fontSize: '10px', fontWeight: 500 }}><strong>Quote #:</strong> {quoteNumber}</p>
          <p style={{ margin: '2px 0', fontSize: '10px', fontWeight: 500 }}><strong>Valid Until:</strong> {(() => { const d = new Date(); d.setDate(d.getDate() + 15); return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }); })()}</p>
        </div>
      </div>
      <div style={{ padding: '20px 0' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '10px', fontWeight: 700, color: '#374151' }}>Quotation For:</h3>
        <p style={{ margin: '2px 0' }}>{quotation.customerName}</p>
        {quotation.customerBusinessName && <p style={{ margin: '2px 0' }}>{quotation.customerBusinessName}</p>}
        <p style={{ margin: '2px 0' }}>{quotation.customerAddress}</p>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
            <th style={{ padding: '10px', textAlign: 'left', fontWeight: 700 }}>Description</th>
            <th style={{ padding: '10px', textAlign: 'center', fontWeight: 700 }}>Quantity</th>
            <th style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>Unit Price (₹)</th>
            <th style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          {quotation.tasks.map((task, index) => (
            <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '10px', verticalAlign: 'top' }}>
                <p style={{ fontWeight: 700, margin: 0 }}>{task.item}</p>
                <p style={{ color: '#6b7280', margin: 0 }}>{task.description || ''}</p>
              </td>
              <td style={{ padding: '10px', textAlign: 'center', verticalAlign: 'top' }}>{task.quantity}</td>
              <td style={{ padding: '10px', textAlign: 'right', verticalAlign: 'top' }}>₹{task.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style={{ padding: '10px', textAlign: 'right', verticalAlign: 'top' }}>₹{(task.quantity * task.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
        <table style={{ width: '40%' }}>
          <tbody>
            <tr><td style={{ padding: '5px 0' }}>Subtotal:</td><td style={{ padding: '5px 0', textAlign: 'right' }}>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
            <tr><td style={{ padding: '5px 0' }}>Tax (18% GST):</td><td style={{ padding: '5px 0', textAlign: 'right' }}>₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
            <tr style={{ fontWeight: 700, fontSize: '12px' }}><td style={{ paddingTop: '10px', borderTop: '2px solid #111827' }}>TOTAL:</td><td style={{ paddingTop: '10px', borderTop: '2px solid #111827', textAlign: 'right' }}>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
          </tbody>
        </table>
      </div>
       <div style={{ marginTop: '40px', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
        <h4 style={{ margin: '0 0 10px', fontWeight: 700 }}>Terms &amp; Conditions</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#6b7280' }}>
          <li>50% advance payment is required to start the project.</li>
          <li>The remaining 50% is due upon project completion, before final delivery.</li>
          <li>This quotation is valid for 15 days from the date of issue.</li>
          <li>Any changes or additions to the scope of work may incur additional charges.</li>
        </ul>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '80px' }}>
        <div style={{ width: '45%' }}>
          <div style={{ borderTop: '1px solid #111827', paddingTop: '8px' }}>
            <p style={{ margin: 0 }}>Authorized Signature</p>
            <p style={{ margin: '2px 0', color: '#6b7280' }}>PHBKT Group Limited</p>
          </div>
        </div>
        <div style={{ width: '45%' }}>
          <div style={{ borderTop: '1px solid #111827', paddingTop: '8px' }}>
            <p style={{ margin: 0 }}>Client Signature</p>
            <p style={{ margin: '2px 0', color: '#6b7280' }}>{quotation.customerName}</p>
          </div>
        </div>
      </div>
    </div>
);


export function QuotationTab({ workItem }: QuotationTabProps) {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  const [isGenerating, setIsGenerating] = useState(false);
  const [openPopovers, setOpenPopovers] = useState<Record<number, boolean>>({});

  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(QuotationFormSchema),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      customerBusinessName: '',
      customerAddress: '',
      tasks: [{ process: '', task: '', item: '', description: '', quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'tasks',
  });
  
  const quotationData = form.watch();
  const subtotal = quotationData.tasks.slice(0, -1).reduce((acc, task) => acc + (task.quantity * task.unitPrice), 0);
  const tax = subtotal * 0.18;
  const grandTotal = subtotal + tax;
  const quoteNumber = `Q-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;


  useEffect(() => {
    if (workItem) {
      const fullAddress = workItem.relatedContact.address
        ? `${workItem.relatedContact.address.line1}, ${workItem.relatedContact.address.city}, ${workItem.relatedContact.address.state} ${workItem.relatedContact.address.zipcode}`
        : '';
      
      const initialTasks = workItem.tasks?.length > 0 ? workItem.tasks.map(task => ({
          process: workItem.process,
          item: task.text,
          task: task.text,
          description: '',
          quantity: 1,
          unitPrice: 0,
        })) : [];

      form.reset({
        customerName: workItem.relatedContact.name || '',
        customerPhone: workItem.relatedContact.phone || '',
        customerBusinessName: workItem.relatedContact.businessName || '',
        customerAddress: fullAddress,
        tasks: [...initialTasks, { process: '', task: '', item: '', description: '', quantity: 1, unitPrice: 0 }],
      });
    }
  }, [workItem, form]);

  const handleGenerateQuote = async (data: QuotationFormValues) => {
    if (!firestore || !user) {
        toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
        return;
    }

    setIsGenerating(true);
    const input = document.getElementById('quotation-to-print');
    if (!input) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find quotation template to print.' });
        setIsGenerating(false);
        return;
    }
    
    const finalQuotationData = { ...data, tasks: data.tasks.slice(0, -1) };

    try {
        const canvas = await html2canvas(input, { scale: 2 });
        
        setTimeout(async () => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            
            const fileName = `Quotation_Q-${quoteNumber.split('-').pop()}.pdf`;
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
            setIsGenerating(false);
        }, 100); 

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
             <QuotationPrintTemplate quotation={{...quotationData, tasks: quotationData.tasks.slice(0,-1)}} subtotal={subtotal} tax={tax} grandTotal={grandTotal} quoteNumber={quoteNumber} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Generate Quotation</CardTitle>
            <CardDescription className="text-xs">
              Fill in the details below to generate a new quotation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleGenerateQuote)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-6">
                   <div className="md:col-span-1">
                      <FormLabel className="text-xs">Customer Details</FormLabel>
                   </div>
                   <div className="md:col-span-2 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField
                          control={form.control}
                          name="customerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} placeholder="Customer Name" className="text-xs" />
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
                              <FormControl>
                                <Input {...field} placeholder="Customer Phone" className="text-xs" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="customerBusinessName"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} placeholder="Business Name (Optional)" className="text-xs" />
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
                              <Input {...field} placeholder="Customer Address" className="text-xs" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                   </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Line Items</h3>
                  
                  {/* The entry form for the new item */}
                  <div className="grid grid-cols-12 gap-2 items-start border p-3 rounded-md">
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
                                    <SelectTrigger className='text-xs h-9'>
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
                                          className={cn("w-full justify-between text-xs h-9", !taskField.value && "text-muted-foreground")}
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
                                            {(processTaskMap[form.watch(`tasks.${fields.length - 1}.process`)] || []).map((task) => (
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
                                    className="text-xs"
                                    onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
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
                                    className="text-xs"
                                    onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                         <div className="col-span-2">
                           <FormLabel className='text-xs'>Total</FormLabel>
                           <div className="h-9 flex items-center text-xs font-medium">
                            ₹{(form.watch(`tasks.${fields.length - 1}.quantity`) * form.watch(`tasks.${fields.length - 1}.unitPrice`)).toLocaleString()}
                           </div>
                         </div>
                      </div>
                  
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ process: '', task: '', item: '', description: '', quantity: 1, unitPrice: 0 })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                  </Button>

                  {/* Display previously added items */}
                  {fields.length > 1 && (
                    <div className="space-y-2 pt-4">
                      <h4 className="text-xs font-medium text-muted-foreground">Added Items</h4>
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
                              <TableCell className='text-right text-xs py-2'>₹{field.unitPrice.toLocaleString()}</TableCell>
                              <TableCell className='text-right text-xs py-2'>₹{(field.quantity * field.unitPrice).toLocaleString()}</TableCell>
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

                </div>
                 <div className="flex justify-end">
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
                <Button type="submit" disabled={isGenerating}>
                  {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isGenerating ? 'Generating...' : 'Generate Quotation'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
  );
}
