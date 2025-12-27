
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
import { Trash2, PlusCircle, Loader2 } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { useFirebase } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface QuotationTabProps {
  workItem: WorkItem;
}

export function QuotationTab({ workItem }: QuotationTabProps) {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(QuotationFormSchema),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      customerBusinessName: '',
      customerAddress: '',
      tasks: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'tasks',
  });

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
        tasks: workItem.tasks.map(task => ({
          item: task.text,
          description: '',
          quantity: 1,
          unitPrice: 0,
        })),
      });
    }
  }, [workItem, form]);

  const generateAndSavePdf = async (data: QuotationFormValues) => {
    if (!printRef.current || !firestore || !user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again."
      });
      return;
    }
    
    setIsGenerating(true);

    try {
      // Use html2canvas to capture the printable content
      const canvas = await html2canvas(printRef.current, {
        scale: 2, // Increase scale for better quality
      });
      const imgData = canvas.toDataURL('image/png');

      // Create a new PDF
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      
      // Get PDF as a data URL
      const pdfDataUrl = pdf.output('datauristring');
      const fileName = `Quotation_${workItem.customId}.pdf`;

      // 1. Trigger the download on the client
      const link = document.createElement("a");
      link.href = pdfDataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 2. Save the generated PDF as an attachment in Firestore
      const attachmentsRef = collection(firestore, 'work_items', workItem.id, 'attachments');
      const newAttachmentRef = doc(attachmentsRef);
      
      const attachmentData = {
          id: newAttachmentRef.id,
          workItemId: workItem.id,
          url: pdfDataUrl,
          direction: 'Outbound',
          fileName: fileName,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.uid,
          type: 'QUOTE',
          documentSource: 'Manual',
          businessEvent: 'QUOTATION',
      };
      
      // Await the setDoc to ensure it's saved before confirming
      await setDoc(newAttachmentRef, attachmentData);

      toast({
        title: 'Quotation Generated & Saved',
        description: 'The PDF has been downloaded and saved to attachments.',
      });

    } catch (error: any) {
      console.error("Failed to generate or save quotation:", error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const formData = form.watch();
  
  const subtotal = formData.tasks.reduce((acc, task) => acc + (task.quantity * task.unitPrice), 0);
  const tax = subtotal * 0.18;
  const grandTotal = subtotal + tax;

  return (
    <>
      <div className="p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Generate Quotation</CardTitle>
            <CardDescription className="text-xs">
              Fill in the details below to generate a new quotation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(generateAndSavePdf)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Customer Name</FormLabel>
                        <FormControl>
                          <Input {...field} className="text-xs" />
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
                          <Input {...field} className="text-xs" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customerBusinessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Business Name</FormLabel>
                        <FormControl>
                          <Input {...field} className="text-xs" />
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
                        <FormLabel className="text-xs">Customer Address</FormLabel>
                        <FormControl>
                          <Input {...field} className="text-xs" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Line Items</h3>
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-start border p-3 rounded-md">
                        <div className="col-span-3">
                          <FormField
                            control={form.control}
                            name={`tasks.${index}.item`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Item / Service</FormLabel>
                                <FormControl>
                                  <Input {...field} className="text-xs" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-5">
                          <FormField
                            control={form.control}
                            name={`tasks.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Description</FormLabel>
                                <FormControl>
                                  <Textarea {...field} className="text-xs min-h-[40px] h-10"/>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-1">
                          <FormField
                            control={form.control}
                            name={`tasks.${index}.quantity`}
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
                            name={`tasks.${index}.unitPrice`}
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
                        <div className="col-span-1 flex items-end h-full">
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-9 w-9">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ item: '', description: '', quantity: 1, unitPrice: 0 })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                  </Button>
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

      {/* Hidden div for printing */}
      <div className="absolute -left-[9999px] top-auto" aria-hidden="true">
        <div ref={printRef} style={{ width: '800px', backgroundColor: 'white', padding: '40px' }}>
            <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
            .quotation-print { 
              font-family: 'Inter', sans-serif; 
              color: #111827; 
              font-size: 10px;
            }
            .meta-header-print { display: flex; justify-content: space-between; font-size: 9px; color: #6b7280; margin-bottom: 20px; }
            .header-print { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 15px; border-bottom: 1px solid #e5e7eb; }
            .company-details-print { display: flex; align-items: center; gap: 16px; }
            .company-details-print .logo-print { height: 40px; width: 40px; }
            .company-details-print .company-name-print { font-size: 18px; font-weight: 700; color: #000; }
            .quote-details-print { text-align: right; }
            .quote-details-print h2 { margin: 0 0 10px; font-size: 24px; font-weight: 700; color: #374151; }
            .quote-details-print p { margin: 2px 0; font-size: 10px; font-weight: 500; }
            .client-details-print { padding: 20px 0; }
            .client-details-print h3 { margin: 0 0 8px; font-size: 10px; font-weight: 700; color: #374151; }
            .client-details-print p { margin: 2px 0; }
            .table-print { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .table-print th { background-color: #f3f4f6; padding: 10px; text-align: left; font-weight: 700; border-bottom: 1px solid #e5e7eb; }
            .table-print td { padding: 10px; vertical-align: top; }
            .item-row-print { border-bottom: 1px solid #e5e7eb; }
            .table-print .text-center { text-align: center; }
            .table-print .text-right { text-align: right; }
            .font-bold-print { font-weight: 700; }
            .text-muted-foreground-print { color: #6b7280; }
            .summary-print { display: flex; justify-content: flex-end; margin-top: 20px; }
            .summary-print table { width: 40%; }
            .summary-print td { padding: 5px 0; }
            .total-row-print td { padding-top: 10px; border-top: 2px solid #111827; font-weight: 700; font-size: 12px; }
            `}</style>
             <div className="quotation-print">
                 <div className="meta-header-print">
                     <span>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}, {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                     <span>Business Quotation</span>
                 </div>
                 <div className="header-print">
                     <div className="company-details-print">
                        <svg className="logo-print" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                          <g transform="translate(50,50)">
                            <path d="M0,0 L0,-50 A50,50 0 0,1 50,0 Z" fill="hsl(173 58% 39%)" transform="rotate(0)"/>
                            <path d="M0,0 L0,-50 A50,50 0 0,1 50,0 Z" fill="hsl(27 87% 67%)" transform="rotate(90)"/>
                            <path d="M0,0 L0,-50 A50,50 0 0,1 50,0 Z" fill="hsl(0 100% 25%)" transform="rotate(180)"/>
                            <path d="M0,0 L0,-50 A50,50 0 0,1 50,0 Z" fill="hsl(0 39% 47%)" transform="rotate(270)"/>
                          </g>
                        </svg>
                        <div>
                          <h1 className="company-name-print">PHBKT Group Limited</h1>
                          <p>123 Business Road, Tech Park</p>
                          <p>Pune, Maharashtra, 411057</p>
                          <p>Email: contact@phbkt.com | Phone: +91 98765 43210</p>
                        </div>
                     </div>
                     <div className="quote-details-print">
                         <h2>QUOTATION</h2>
                         <p><strong>Date:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                         <p><strong>Quote #:</strong> Q-{new Date().getFullYear()}-{String(Date.now()).slice(-5)}</p>
                         <p><strong>Valid Until:</strong> {(() => { const d = new Date(); d.setDate(d.getDate() + 15); return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }); })()}</p>
                     </div>
                 </div>
                 <div className="client-details-print">
                     <h3>Quotation For:</h3>
                     <p>{formData.customerName}</p>
                     {formData.customerBusinessName && <p>{formData.customerBusinessName}</p>}
                     <p>{formData.customerAddress}</p>
                 </div>
                 <table className="table-print">
                     <thead>
                         <tr>
                             <th>Description</th>
                             <th className="text-center">Quantity</th>
                             <th className="text-right">Unit Price (₹)</th>
                             <th className="text-right">Total (₹)</th>
                         </tr>
                     </thead>
                     <tbody>
                         {formData.tasks.map((task, i) => (
                             <tr className="item-row-print" key={i}>
                                 <td>
                                     <p className="font-bold-print">{task.item}</p>
                                     <p className="text-muted-foreground-print">{task.description || ''}</p>
                                 </td>
                                 <td className="text-center">{task.quantity}</td>
                                 <td className="text-right">₹{task.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                 <td className="text-right">₹{(task.quantity * task.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
                 <div className="summary-print">
                     <table>
                         <tbody>
                             <tr><td>Subtotal:</td><td className="text-right">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                             <tr><td>Tax (18% GST):</td><td className="text-right">₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                             <tr className="total-row-print"><td>TOTAL:</td><td className="text-right">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                         </tbody>
                     </table>
                 </div>
             </div>
        </div>
      </div>
    </>
  );
}
