'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { WorkItem, QuotationFormValues, QuotationTask } from '@/lib/types';
import { generateQuotation } from '@/ai/flows/generate-quotation-flow';
import { useFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { QuotationFormSchema } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Trash2, PlusCircle } from 'lucide-react';
import { Textarea } from './ui/textarea';

interface QuotationTabProps {
  workItem: WorkItem;
}

export function QuotationTab({ workItem }: QuotationTabProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [generatedQuoteUrl, setGeneratedQuoteUrl] = useState<string | null>(null);
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

  const handleGenerateQuote = async (data: QuotationFormValues) => {
    setIsGenerating(true);
    setGeneratedQuoteUrl(null);

    try {
      const result = await generateQuotation({
        ...data,
        tasks: data.tasks.map(t => ({...t, quantity: Number(t.quantity), unitPrice: Number(t.unitPrice)}))
      });

      if (result.pdfUrl) {
        setGeneratedQuoteUrl(result.pdfUrl);
        toast({
          title: 'Quotation Generated',
          description: 'A preview is available. You can now attach it to the case.',
        });
      } else {
        throw new Error(result.error || 'Failed to generate quotation PDF.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error.message,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAttachQuote = async () => {
    if (!generatedQuoteUrl || !firestore || !user) return;

    const attachmentsRef = collection(firestore, 'work_items', workItem.id, 'attachments');

    try {
      await addDocumentNonBlocking(attachmentsRef, {
        workItemId: workItem.id,
        url: generatedQuoteUrl,
        direction: 'Outbound',
        fileName: `Quotation_${workItem.customId}_${new Date().toISOString()}.pdf`,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user.uid,
        type: 'QUOTE',
        documentSource: 'Internal',
        businessEvent: 'Quotation Generation',
      });

      toast({
        title: 'Quotation Attached',
        description: 'The generated quotation has been attached to the work item.',
      });
      setGeneratedQuoteUrl(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Attachment Failed',
        description: error.message || 'Could not attach the quotation.',
      });
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
                                <Input type="number" {...field} className="text-xs" />
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
                                <Input type="number" {...field} className="text-xs" />
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
                {isGenerating ? 'Generating...' : 'Create Quotation'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {generatedQuoteUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quotation Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <iframe src={generatedQuoteUrl} className="border rounded-md w-full h-[600px]" title="Generated Quotation Preview" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGeneratedQuoteUrl(null)}>Discard</Button>
              <Button onClick={handleAttachQuote}>Attach to Case</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
