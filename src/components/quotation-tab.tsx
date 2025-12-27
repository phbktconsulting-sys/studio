

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
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface QuotationTabProps {
  workItem: WorkItem;
}

export const QuotationPrintTemplate = ({ quotation, subtotal, tax, grandTotal }: { quotation: QuotationFormValues, subtotal: number, tax: number, grandTotal: number }) => (
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
          <p style={{ margin: '2px 0', fontSize: '10px', fontWeight: 500 }}><strong>Quote #:</strong> Q-{new Date().getFullYear()}-{String(Date.now()).slice(-5)}</p>
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
    </div>
);


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
  
  const quotationData = form.watch();
  const subtotal = quotationData.tasks.reduce((acc, task) => acc + (task.quantity * task.unitPrice), 0);
  const tax = subtotal * 0.18;
  const grandTotal = subtotal + tax;

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
        tasks: workItem.tasks?.length > 0 ? workItem.tasks.map(task => ({
          item: task.text,
          description: '',
          quantity: 1,
          unitPrice: 0,
        })) : [],
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

    try {
        const canvas = await html2canvas(input, { scale: 2 });
        
        setTimeout(async () => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            
            const fileName = `Quotation_${workItem.customId}.pdf`;
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
                quotationData: data, 
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
             <QuotationPrintTemplate quotation={quotationData} subtotal={subtotal} tax={tax} grandTotal={grandTotal} />
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
  );
}
