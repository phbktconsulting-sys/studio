
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { WorkItem, QuotationFormValues, QuotationTask } from '@/lib/types';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { QuotationFormSchema } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Trash2, PlusCircle } from 'lucide-react';
import { Textarea } from './ui/textarea';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';


// This is the printable component that will be rendered off-screen
const PrintableQuotation = ({ data, forwardedRef }: { data: QuotationFormValues, forwardedRef: React.Ref<HTMLDivElement> }) => {
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formattedTime = currentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const validUntilDate = new Date();
  validUntilDate.setDate(validUntilDate.getDate() + 15);
  const validUntil = validUntilDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const subtotal = data.tasks.reduce((acc, task) => acc + (Number(task.quantity) * Number(task.unitPrice)), 0);
  const tax = subtotal * 0.18;
  const grandTotal = subtotal + tax;

  const tasksHtml = data.tasks.map((task, index) => (
    `<tr key=${index} class="item-row">
      <td>
        <p class="font-bold">${task.item}</p>
        <p class="text-muted-foreground">${task.description || ''}</p>
      </td>
      <td class="text-center">${task.quantity}</td>
      <td class="text-right">₹${Number(task.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td class="text-right">₹${(Number(task.quantity) * Number(task.unitPrice)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>`
  )).join('');

  const htmlTemplate = `
      <div class="container">
        <div class="meta-header">
            <span>${formattedDate}, ${formattedTime}</span>
            <span>Business Quotation</span>
        </div>
        <div class="header">
          <div class="company-details">
            <div style="display: flex; align-items: center; gap: 16px;">
                <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <g transform="translate(50,50)">
                    <path d="M0,0 L0,-50 A50,50 0 0,1 50,0 Z" fill="#4B5563" transform="rotate(0)"></path>
                    <path d="M0,0 L0,-50 A50,50 0 0,1 50,0 Z" fill="#FBBF24" transform="rotate(90)"></path>
                    <path d="M0,0 L0,-50 A50,50 0 0,1 50,0 Z" fill="#059669" transform="rotate(180)"></path>
                    <path d="M0,0 L0,-50 A50,50 0 0,1 50,0 Z" fill="#3B82F6" transform="rotate(270)"></path>
                  </g>
                </svg>
                <div style="font-size: 14px; font-weight: bold; line-height: 1.2;">
                  <span>PHBKT</span><br/>
                  <span>Group</span><br/>
                  <span>Limited</span>
                </div>
            </div>
            <p style="margin-top: 10px;">123 Business Road, Tech Park</p>
            <p>Pune, Maharashtra, 411057</p>
            <p>Email: contact@phbkt.com | Phone: +91 98765 43210</p>
          </div>
          <div class="quote-details">
            <h2>QUOTATION</h2>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Quote #:</strong> Q-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}</p>
            <p><strong>Valid Until:</strong> ${validUntil}</p>
          </div>
        </div>

        <div class="client-details">
          <h3>Quotation For:</h3>
          <p>${data.customerName}</p>
          ${data.customerBusinessName ? `<p>${data.customerBusinessName}</p>` : ''}
          <p>${data.customerAddress || ''}</p>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-center">Quantity</th>
              <th class="text-right">Unit Price (₹)</th>
              <th class="text-right">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${tasksHtml}
          </tbody>
        </table>

        <div class="summary">
          <table>
            <tbody>
              <tr>
                <td>Subtotal:</td>
                <td class="text-right">₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>Tax (18% GST):</td>
                <td class="text-right">₹${tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              <tr class="total-row">
                <td>TOTAL:</td>
                <td class="text-right">₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

         <div class="footer-section">
            <h3>Terms & Conditions</h3>
            <ol>
                <li>The above prices are exclusive of all applicable taxes.</li>
                <li>This quotation is valid for a period of 15 days from the date of issue.</li>
                <li>Any changes to the scope of work may result in a revision of the quotation.</li>
                <li>Payment terms are 50% advance and 50% upon completion, unless otherwise agreed.</li>
            </ol>
        </div>

        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-line"></div>
                <p>Authorized Signature</p>
                <p><strong>For PHBKT Group Limited</strong></p>
            </div>
            <div class="signature-box">
                <div class="signature-line"></div>
                <p>Client Signature</p>
                <p><strong>${data.customerName}</strong></p>
            </div>
        </div>
      </div>
  `;

  const styles = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
      body { 
        font-family: 'Inter', sans-serif; 
        margin: 0; 
        padding: 20px; 
        background-color: #fff; 
        color: #111827; 
        font-size: 10px;
      }
      .container { 
        width: 800px; 
        margin: auto;
        background: white;
        padding: 20px;
      }
      .meta-header {
        display: flex;
        justify-content: space-between;
        font-size: 9px;
        color: #6b7280;
        margin-bottom: 20px;
      }
      .header { 
        display: flex; 
        justify-content: space-between; 
        align-items: flex-start; 
        padding-bottom: 15px; 
        border-bottom: 1px solid #e5e7eb;
      }
      .header .company-details h1 { 
        margin: 0 0 5px; 
        font-size: 18px; 
        font-weight: 700;
        color: #000; 
      }
      .header .company-details p { 
        margin: 2px 0; 
        line-height: 1.5;
      }
      .header .quote-details { text-align: right; }
      .header .quote-details h2 { 
        margin: 0 0 10px; 
        font-size: 24px;
        font-weight: 700; 
        color: #374151; 
      }
      .header .quote-details p { 
        margin: 2px 0; 
        font-size: 10px;
        font-weight: 500;
      }
      .client-details { padding: 20px 0; }
      .client-details h3 { 
          margin: 0 0 8px;
          font-size: 10px;
          font-weight: 700;
          color: #374151;
      }
       .client-details p { margin: 2px 0; }
      .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      .table th {
        background-color: #f3f4f6;
        padding: 10px;
        text-align: left;
        font-weight: 700;
        border-bottom: 1px solid #e5e7eb;
      }
      .table td { 
        padding: 10px; 
        vertical-align: top;
      }
      .table .item-row { border-bottom: 1px solid #e5e7eb; }
      .table .item-row:last-child { border-bottom: none; }
      .table th:first-child, .table td:first-child { width: 50%; }
      .table .text-center { text-align: center; }
      .table .text-right { text-align: right; }
      .font-bold { font-weight: 700; }
      .text-muted-foreground { color: #6b7280; }
      
      .summary { display: flex; justify-content: flex-end; margin-top: 20px; }
      .summary table { width: 40%; }
      .summary td { padding: 5px 0; }
      .summary .total-row td {
          padding-top: 10px;
          border-top: 2px solid #111827;
          font-weight: 700;
          font-size: 12px;
      }
      .summary .text-right { text-align: right; }
      .footer-section {
          margin-top: 30px;
          padding-top: 10px;
          border-top: 1px solid #e5e7eb;
      }
      .footer-section h3 {
          font-weight: 700;
          margin-bottom: 8px;
          font-size: 11px;
      }
      .footer-section ol {
          list-style-position: inside;
          padding-left: 0;
          margin: 0;
      }
       .footer-section li {
          margin-bottom: 4px;
          color: #6b7280;
      }
       .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
        }
        .signature-box {
            width: 45%;
            text-align: center;
        }
        .signature-line {
            border-top: 1px solid #374151;
            margin-bottom: 8px;
        }
        .signature-box p {
            margin: 0;
            line-height: 1.4;
        }
    </style>
  `;

  return (
    <div ref={forwardedRef} dangerouslySetInnerHTML={{ __html: styles + htmlTemplate }} />
  );
};


interface QuotationTabProps {
  workItem: WorkItem;
}

export function QuotationTab({ workItem }: QuotationTabProps) {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  const [isGenerating, setIsGenerating] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);


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


  const handleGenerateQuote = (data: QuotationFormValues) => {
    if (!printableRef.current || !user || !firestore) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not generate PDF. Required components are not ready."
      });
      return;
    }
    
    setIsGenerating(true);

    const generateAndSavePdf = async () => {
      try {
        const canvas = await html2canvas(printableRef.current!, {
          scale: 2,
          useCORS: true,
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

        const fileName = `Quotation_${workItem.customId}.pdf`;
        pdf.save(fileName);

        const pdfDataUrl = pdf.output('datauristring');
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

        // Use setDoc with an explicit doc ref to ensure ID consistency
        setDocumentNonBlocking(newAttachmentRef, attachmentData, {});

        toast({
          title: 'Quotation Generated & Saved',
          description: 'The PDF has been downloaded and saved to attachments.',
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Generation Failed',
          description: error.message || 'An unexpected error occurred while generating the PDF.',
        });
      } finally {
        setIsGenerating(false);
      }
    };
    
    // We need a timeout to ensure the printable component has re-rendered with the latest data
    setTimeout(generateAndSavePdf, 100);
  };
  
  const onSubmit = (data: QuotationFormValues) => {
    handleGenerateQuote(data);
  };


  return (
    <>
    <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '840px' }}>
      {<PrintableQuotation data={form.getValues()} forwardedRef={printableRef} />}
    </div>

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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                {isGenerating ? 'Generating...' : 'Generate Quotation'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
