'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
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
import { useFirebase } from '@/firebase';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { batchCreateWorkItems } from '@/ai/flows/batch-create-work-items-flow';

const processTypes = [
  'Request Information',
  'Request Quotation',
  'Request Application',
  'Request Website',
  'Request inquiry',
  'Request Backend Support',
  'Request Other',
];

interface BatchWorkCreateProps {
  onBack: () => void;
}

export function BatchWorkCreate({ onBack }: BatchWorkCreateProps) {
  const { toast } = useToast();
  const { user } = useFirebase();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [process, setProcess] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');

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
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
        
        // Skip header row and filter out any empty rows
        const rows = json.slice(1).filter((row: any) => row.some((cell: any) => cell !== null && cell !== ''));
        
        if (rows.length === 0) {
            throw new Error("The Excel file is empty or contains no data after the header row.");
        }

        const workItemsToCreate = rows.map((row: any) => ({
          customerName: row[0] || '',
          customerEmail: row[1] || '',
          customerPhone: String(row[2] || ''),
          customerPhoneSecondary: String(row[3] || ''),
          customerAddress: row[4] || '',
          overview: row[5] || '',
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
          onBack(); // Go back to admin dashboard
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
  
   const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Customer Name', 'Customer Email', 'Customer Phone', 'Customer Phone Secondary', 'Customer Address', 'Overview / Notes']
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'work_item_template.xlsx');
  };

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
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Ensure your Excel file has a header row matching the template columns.</li>
            <li>The columns are: Customer Name, Customer Email, Customer Phone, Customer Phone Secondary, Customer Address, and Overview / Notes.</li>
            <li>The system will process all rows after the header.</li>
            <li>All created work items will be assigned to you with 'Medium' urgency.</li>
          </ul>
        </AlertDescription>
         <Button variant="link" size="sm" onClick={downloadTemplate} className="p-0 h-auto mt-2 text-xs">
            <FileDown className="mr-2 h-4 w-4" />
            Download Excel Template
        </Button>
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