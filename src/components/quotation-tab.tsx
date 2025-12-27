
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { WorkItem, QuotationFormValues } from '@/lib/types';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { QuotationFormSchema } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Trash2, PlusCircle } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { useFirebase } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { generateQuotation } from '@/ai/flows/generate-quotation-flow';


interface QuotationTabProps {
  workItem: WorkItem;
}

export function QuotationTab({ workItem }: QuotationTabProps) {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  const [isGenerating, setIsGenerating] = useState(false);

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


  const onSubmit = async (data: QuotationFormValues) => {
    if (!user || !firestore) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to perform this action."
      });
      return;
    }
    
    setIsGenerating(true);

    try {
      // 1. Call the server flow to generate the PDF
      const result = await generateQuotation(data);
      if (result.error || !result.pdfUrl) {
        throw new Error(result.error || "PDF generation failed on the server.");
      }

      const pdfDataUrl = result.pdfUrl;
      const fileName = `Quotation_${workItem.customId}.pdf`;

      // 2. Trigger the download on the client
      const link = document.createElement("a");
      link.href = pdfDataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 3. Save the generated PDF as an attachment in Firestore
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


  return (
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
  );
}
