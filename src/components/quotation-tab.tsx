'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { WorkItem } from '@/lib/types';
import { generateQuotation } from '@/ai/flows/generate-quotation-flow';
import { useFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection }from 'firebase/firestore';

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
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [selectedProcess, setSelectedProcess] = useState<string>('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [generatedQuoteUrl, setGeneratedQuoteUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleTaskChange = (task: string) => {
    setSelectedTasks((prev) =>
      prev.includes(task) ? prev.filter((t) => t !== task) : [...prev, task]
    );
  };

  const handleGenerateQuote = async () => {
    if (!selectedProcess || selectedTasks.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Selection Required',
        description: 'Please select a process and at least one task.',
      });
      return;
    }
    
    setIsGenerating(true);
    setGeneratedQuoteUrl(null);

    try {
      const result = await generateQuotation({
        process: selectedProcess,
        tasks: selectedTasks,
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
        setSelectedProcess('');
        setSelectedTasks([]);
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
            Select a process and the tasks to include in the quotation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Process</Label>
            <Select onValueChange={setSelectedProcess} value={selectedProcess}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select a process" />
              </SelectTrigger>
              <SelectContent>
                {processTypes.map((process) => (
                  <SelectItem key={process} value={process} className="text-xs">
                    {process}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProcess && (
            <div className="space-y-2">
              <Label className="text-xs">Tasks for {selectedProcess}</Label>
              <Card className="max-h-48 overflow-y-auto p-4">
                <div className="space-y-2">
                  {(processTaskMap[selectedProcess] || []).map((task) => (
                    <div key={task} className="flex items-center space-x-2">
                      <Checkbox
                        id={task}
                        checked={selectedTasks.includes(task)}
                        onCheckedChange={() => handleTaskChange(task)}
                      />
                      <Label htmlFor={task} className="text-xs font-normal">
                        {task}
                      </Label>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
          
          <Button onClick={handleGenerateQuote} disabled={isGenerating || !selectedProcess || selectedTasks.length === 0}>
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
