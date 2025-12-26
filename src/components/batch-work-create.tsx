
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, FileDown, Info } from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { batchCreateWorkItems } from '@/ai/flows/batch-create-work-items-flow';
import type { WorkItem, User } from '@/lib/types';
import { collection, query } from 'firebase/firestore';
import { format } from 'date-fns';

const processTypes = [
  "New Business Request",
  "Development Services (Web & App)",
  "Operations & Support (Backend)",
  "Digital Services Request",
  "Feedback / Complaint",
  "Other Service Request",
];

interface BatchWorkCreateProps {
  onBack: () => void;
}

export function BatchWorkCreate({ onBack }: BatchWorkCreateProps) {
  const { toast } = useToast();
  const { user, firestore } = useFirebase();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [process, setProcess] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [fileName, setFileName] = useState('');

  // Fetch all work items and users for the report
  const workItemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'work_items'));
  }, [firestore]);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: workItems, isLoading: workItemsLoading } = useCollection<WorkItem>(workItemsQuery);
  const { data: users, isLoading: usersLoading } = useCollection<User>(usersQuery);

  const usersMap = useMemo(() => {
    if (!users) return new Map<string, string>();
    return new Map(users.map(u => [u.uid, u.displayName || u.email || 'N/A']));
  }, [users]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.type === 'application/vnd.ms-excel') {
        setSelectedFile(file);
        setFileName(file.name);
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid File Type',
          description: 'Please upload a valid Excel file (.xlsx, .xls).',
        });
        event.target.value = ''; // Reset file input
        setSelectedFile(null);
        setFileName('');
      }
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a file to upload.' });
      return;
    }
    if (!process) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a process.' });
      return;
    }
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx');
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
        
        const rows = json.slice(1).filter((row: any) => row.some((cell: any) => cell !== null && cell !== ''));
        
        if (rows.length === 0) {
            throw new Error("The Excel file is empty or contains no data after the header row.");
        }

        const workItemsToCreate = rows.map((row: any) => ({
          customerName: row[0] || '',
          customerEmail: row[1] || '',
          customerPhone: String(row[2] || ''),
          customerPhoneSecondary: String(row[3] || ''),
          customerAddressLine1: row[4] || '',
          customerAddressLine2: row[5] || '',
          customerCity: row[6] || '',
          customerState: row[7] || '',
          customerZip: String(row[8] || ''),
          customerCountry: row[9] || '',
          overview: row[10] || '',
        }));

        const result = await batchCreateWorkItems({
          process,
          assignedTo: user.uid,
          createdBy: user.uid,
          items: workItemsToCreate
        });
        
        if (result.successCount > 0) {
          toast({
            title: 'Batch Creation Successful',
            description: `${result.successCount} work items have been created.`,
          });
          onBack();
        } else {
           throw new Error(result.error || "Batch creation failed with an unknown error.");
        }

      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Processing Failed',
          description: error.message || 'An error occurred while processing the file.',
        });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };
  
   const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([
      ['Customer Name', 'Customer Email', 'Customer Phone', 'Customer Phone Secondary', 'Address Line 1', 'Address Line 2', 'City', 'State', 'Zipcode', 'Country', 'Overview / Notes']
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'work_item_template.xlsx');
  };
  
  const handleDownloadReport = async () => {
    if (!workItems || workItems.length === 0) {
        toast({ title: 'No Data', description: 'There are no work items to export.' });
        return;
    }

    setIsDownloading(true);
    
    try {
        const XLSX = await import('xlsx');
        const reportData = workItems.map(item => ({
            'Case ID': item.customId,
            'Process': item.process,
            'Status': item.status,
            'Urgency': item.urgency,
            'Subject': item.subject,
            'Assigned To': usersMap.get(item.assignedTo) || item.assignedTo,
            'Created By': usersMap.get(item.createdBy) || item.createdBy,
            'Created At': format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm:ss'),
            'Updated At': format(new Date(item.updatedAt), 'yyyy-MM-dd HH:mm:ss'),
            'Customer Name': item.relatedContact.name,
            'Customer Email': item.relatedContact.email,
            'Customer Phone': item.relatedContact.phone,
            'Customer Phone Secondary': item.relatedContact.phoneSecondary,
            'Customer Address': item.relatedContact.address ? `${item.relatedContact.address.line1}, ${item.relatedContact.address.city}` : '',
            'Customer Unique ID': item.relatedContact.customerUniqueId,
            'Overview': item.overview,
        }));
        
        const ws = XLSX.utils.json_to_sheet(reportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Work Items Report');
        XLSX.writeFile(wb, 'work_items_report.xlsx');
        
        toast({ title: 'Report Downloaded', description: 'The work items report has been successfully downloaded.' });
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Download Failed', description: error.message || 'An unexpected error occurred.' });
    } finally {
        setIsDownloading(false);
    }
  };

  const isLoading = workItemsLoading || usersLoading;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div>
          <h1 className="font-headline text-lg font-bold tracking-tight">Batch Work Create</h1>
          <p className="text-xs text-muted-foreground">Upload an Excel file to create multiple work items.</p>
        </div>
      </div>
      
       <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Instructions</AlertTitle>
        <AlertDescription className="text-xs">
          <div className="flex justify-between items-start">
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>To upload items, select a process and an Excel file with the correct format.</li>
              <li>The Excel columns are: Customer Name, Email, Phone, Secondary Phone, Address Line 1, Address Line 2, City, State, Zip, Country, and Overview.</li>
              <li>To download a report of all existing work items, click the "Download Report" button.</li>
            </ul>
             <div className="flex flex-col space-y-2">
                <Button variant="link" size="sm" onClick={downloadTemplate} className="p-0 h-auto mt-2 text-xs">
                    <FileDown className="mr-2 h-4 w-4" />
                    Download Upload Template
                </Button>
                 <Button variant="secondary" size="sm" onClick={handleDownloadReport} className="h-auto py-1 text-xs" disabled={isDownloading || isLoading}>
                    {isDownloading ? 'Downloading...' : (isLoading ? 'Loading Data...' : 'Download Report')}
                </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>Select the Process and upload your Excel file.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select onValueChange={setProcess} value={process}>
            <SelectTrigger>
              <SelectValue placeholder="Select a Process" />
            </SelectTrigger>
            <SelectContent>
              {processTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="flex w-full cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-input bg-background p-6 hover:border-primary">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {fileName ? `Selected: ${fileName}` : 'Click to select or drag & drop Excel file'}
              </p>
            </div>
            <Input type="file" className="hidden" onChange={handleFileChange} accept=".xlsx, .xls" />
          </label>

        </CardContent>
        <CardFooter>
          <Button onClick={handleProcess} disabled={isProcessing || !selectedFile || !process} className="w-full">
            {isProcessing ? 'Processing...' : 'Create Work Items'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
