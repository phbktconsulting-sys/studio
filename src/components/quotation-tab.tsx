
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { WorkItem, QuotationFormValues, QuotationTask } from '@/lib/types';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { QuotationFormSchema } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Trash2, PlusCircle, Loader2, ChevronsUpDown, X, ArrowLeft, Info, Edit, Plus, Search } from 'lucide-react';
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
  const [isCqPageVisible, setIsCqPageVisible] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);


  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(QuotationFormSchema),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      customerBusinessName: '',
      customerAddress: {
        country: '',
        line1: '',
        line2: '',
        city: '',
        state: '',
        zipcode: '',
      },
      tasks: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'tasks',
  });
  
  const quotationData = form.watch();
  
  useEffect(() => {
    if (workItem && !hasInitialized) {
      form.reset({
        customerName: workItem.relatedContact.name || '',
        customerPhone: workItem.relatedContact.phone || '',
        customerBusinessName: workItem.relatedContact.businessName || '',
        customerAddress: workItem.relatedContact.address ? { ...workItem.relatedContact.address } : {
            country: '', line1: '', line2: '', city: '', state: '', zipcode: ''
        },
        tasks: [], 
      });

      replace([{ process: '', task: '', item: '', description: '', quantity: 0, unitPrice: 0 }]);
      setHasInitialized(true); 
    }
  }, [workItem, form, replace, hasInitialized]);


  const handleGenerateQuote = async (data: QuotationFormValues) => {
    if (!firestore || !user) {
        toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
        return;
    }
    
    const finalTasks = data.tasks.filter(task => !!task.process && !!task.task && !!task.item && !!task.quantity && task.quantity > 0);

    if (finalTasks.length === 0) {
        toast({ variant: "destructive", title: "Error", description: "Please add at least one complete line item to the quotation." });
        return;
    }
    const finalQuotationData = { ...data, tasks: finalTasks as QuotationTask[] };

    setIsGenerating(true);

    try {
        const { default: jsPDF } = await import('jspdf');
        const { default: html2canvas } = await import('html2canvas');
        const { createRoot } = await import('react-dom/client');

        const printContainer = document.createElement('div');
        printContainer.style.position = 'absolute';
        printContainer.style.left = '-9999px';
        document.body.appendChild(printContainer);

        const root = createRoot(printContainer);

        const subtotal = finalTasks.reduce((acc, task) => acc + ((task.quantity || 0) * (task.unitPrice || 0)), 0);
        const tax = subtotal * 0.18;
        const grandTotal = subtotal + tax;
        const quoteNumber = `Q-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;


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
  
  const addedTasks = quotationData.tasks.filter(task => !!task.process && !!task.task && !!task.item && task.quantity && task.quantity > 0);
  const subtotal = addedTasks.reduce((acc, task) => acc + ((task.quantity || 0) * (task.unitPrice || 0)), 0);
  const tax = subtotal * 0.18;
  const grandTotal = subtotal + tax;
  const quoteNumber = `Q-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
  const lastTask = quotationData.tasks[quotationData.tasks.length - 1];
  const isLastTaskValid = !!(lastTask && lastTask.process && lastTask.task && lastTask.item && lastTask.quantity && lastTask.quantity > 0 && lastTask.unitPrice && lastTask.unitPrice > 0);


  if (!isCqPageVisible) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Button 
          onClick={() => setIsCqPageVisible(true)} 
          size="sm"
          className="h-8 bg-black text-white hover:bg-black/80"
        >
          Development Services Quotation
        </Button>
      </div>
    );
  }
  
  return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setIsCqPageVisible(false)}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
            </Button>
            <h2 className="text-lg font-semibold">Create Quotation</h2>
        </div>

        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
             <QuotationPrintTemplate quotation={{...quotationData, tasks: addedTasks.map(t => t as any)}} subtotal={subtotal} tax={tax} grandTotal={grandTotal} quoteNumber={quoteNumber} />
        </div>
        <Card>
          <CardContent className="p-4">
            <Form {...form}>
              <form id="quotation-form" onSubmit={form.handleSubmit(handleGenerateQuote)} className="space-y-4">
                 
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {/* Customer Information Grid */}
                    <div className="p-4 border rounded-lg bg-white space-y-4">
                        <div className="flex items-center gap-2 mb-4 text-blue-600">
                            <Info className="w-5 h-5" />
                            <h3 className="font-semibold text-sm">Customer Details</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                            <FormField control={form.control} name="customerName" render={({ field }) => (<FormItem><FormLabel>Customer Name</FormLabel><FormControl><Input {...field} className="h-8 mt-1"/></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="customerPhone" render={({ field }) => (<FormItem><FormLabel>Customer Phone</FormLabel><FormControl><Input {...field} className="h-8 mt-1"/></FormControl><FormMessage /></FormItem>)} />
                            <div className="col-span-2 grid grid-cols-4 gap-2">
                                <FormField control={form.control} name="customerAddress.line1" render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} className="h-8 mt-1"/></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="customerAddress.city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} className="h-8 mt-1"/></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="customerAddress.state" render={({ field }) => (<FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} className="h-8 mt-1"/></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="customerAddress.zipcode" render={({ field }) => (<FormItem><FormLabel>Zip Code</FormLabel><FormControl><Input {...field} className="h-8 mt-1"/></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </div>
                    </div>


                    {/* Item Details */}
                    <div className="p-4 border rounded-lg bg-white">
                        <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 text-blue-600">
                            <Info className="w-5 h-5" />
                            <h3 className="font-semibold text-sm">Item Details</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                type="button" 
                                size="sm" 
                                onClick={() => append({ process: '', task: '', item: '', description: '', quantity: 0, unitPrice: 0 })} 
                                className="h-8 text-xs"
                                disabled={!isLastTaskValid}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                            </Button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <Table className="min-w-full text-xs">
                            <TableHeader>
                                <TableRow className="bg-gray-50">
                                    <TableHead className="w-[180px]">Process</TableHead>
                                    <TableHead className="w-[180px]">Task</TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="w-[80px]">QTY</TableHead>
                                    <TableHead className="w-[120px]">Unit Price</TableHead>
                                    <TableHead className="w-[120px]">Amount</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => {
                                    const selectedProcess = form.watch(`tasks.${index}.process`);
                                    return (
                                    <TableRow key={field.id}>
                                        <TableCell className="p-1">
                                            <FormField
                                                control={form.control}
                                                name={`tasks.${index}.process`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <Select onValueChange={(value) => { field.onChange(value); form.setValue(`tasks.${index}.task`, ''); }} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Process" /></SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {processTypes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage/>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="p-1">
                                            <FormField
                                                control={form.control}
                                                name={`tasks.${index}.task`}
                                                render={({ field: taskField }) => (
                                                    <FormItem>
                                                        <Select onValueChange={taskField.onChange} value={taskField.value} disabled={!selectedProcess}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Task" /></SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                            {(processTaskMap[selectedProcess] || []).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="p-1">
                                        <FormField
                                            control={form.control}
                                            name={`tasks.${index}.item`}
                                            render={({ field }) => ( <FormItem><FormControl><Input {...field} placeholder="Item Name" className="h-8 text-xs" /></FormControl><FormMessage/></FormItem> )}
                                        />
                                        </TableCell>
                                        <TableCell className="p-1">
                                        <FormField
                                            control={form.control}
                                            name={`tasks.${index}.description`}
                                            render={({ field }) => ( <FormItem><FormControl><Input {...field} placeholder="Description" className="h-8 text-xs" /></FormControl><FormMessage/></FormItem> )}
                                        />
                                        </TableCell>
                                        <TableCell className="p-1">
                                        <FormField
                                            control={form.control}
                                            name={`tasks.${index}.quantity`}
                                            render={({ field }) => ( <FormItem><FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} className="h-8 text-xs w-20" /></FormControl><FormMessage/></FormItem> )}
                                        />
                                        </TableCell>
                                        <TableCell className="p-1">
                                        <FormField
                                            control={form.control}
                                            name={`tasks.${index}.unitPrice`}
                                            render={({ field }) => ( <FormItem><FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} className="h-8 text-xs w-24" /></FormControl><FormMessage/></FormItem> )}
                                        />
                                        </TableCell>
                                        <TableCell className="p-1 font-semibold">
                                        ₹{((form.watch(`tasks.${index}.quantity`) || 0) * (form.watch(`tasks.${index}.unitPrice`) || 0)).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="p-1">
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-7 w-7">
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
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
