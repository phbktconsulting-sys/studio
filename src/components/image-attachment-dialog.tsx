
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';

interface ImageAttachmentDialogProps {
  workItemId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageAttachmentDialog({
  workItemId,
  isOpen,
  onClose,
}: ImageAttachmentDialogProps) {
  const { toast } = useToast();
  const { firestore, user } = useFirebase();
  const [direction, setDirection] = useState<'Inbound' | 'Outbound'>('Inbound');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Basic validation for image type
      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: 'Invalid File Type',
          description: 'Please select an image file.',
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'Please select a file and ensure you are logged in.',
      });
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.readAsDataURL(selectedFile);
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      
      try {
        const attachmentsRef = collection(firestore, 'work_items', workItemId, 'attachments');
        await addDocumentNonBlocking(attachmentsRef, {
          workItemId,
          url: dataUrl,
          direction,
          fileName: selectedFile.name,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.uid,
          // Mocking other fields based on screenshot
          type: direction === 'Inbound' ? 'EMAIL' : 'CORR',
          documentSource: 'PRPC',
          businessEvent: 'DOCGEN',
        });
        
        toast({
          title: 'Image Uploaded',
          description: `${selectedFile.name} has been successfully attached to the work item.`,
        });
        
        // Reset state and close dialog
        setSelectedFile(null);
        setDirection('Inbound');
        onClose();

      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: error.message || 'Could not save the attachment.',
        });
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = (error) => {
        toast({
          variant: 'destructive',
          title: 'File Read Error',
          description: 'Could not read the selected file.',
        });
        setIsUploading(false);
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Attach Image</DialogTitle>
          <DialogDescription>
            Upload an image and specify its direction.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Direction</Label>
            <RadioGroup
              value={direction}
              onValueChange={(value) => setDirection(value as 'Inbound' | 'Outbound')}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Inbound" id="inbound" />
                <Label htmlFor="inbound">Inbound</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Outbound" id="outbound" />
                <Label htmlFor="outbound">Outbound</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="image-upload">Image File</Label>
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    