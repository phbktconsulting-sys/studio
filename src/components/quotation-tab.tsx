'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { WorkItem, Task } from '@/lib/types';
import { generateQuotation } from '@/ai/flows/generate-quotation-flow';
import { useFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection }from 'firebase/firestore';

interface QuotationTabProps {
  workItem: WorkItem;
}

export function QuotationTab({ workItem }: QuotationTabProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [generatedQuoteUrl, setGeneratedQuoteUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateQuote = async () => {
    if (!workItem.process || !workItem.tasks || workItem.tasks.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Information Missing',
        description: 'The work item must have a process and at least one task to generate a quotation.',
      });
      return;
    }
    
    setIsGenerating(true);
    setGeneratedQuoteUrl(null);

    try {
      const result = await generateQuotation({
        process: workItem.process,
        tasks: workItem.tasks.map(t => t.text),
        customerName: workItem.relatedContact.name,
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
    } catch(error: any) {
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
            Click the button to generate a quotation based on the work item's process and existing tasks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGenerateQuote} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Create Quotation'}
          </Button>
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
