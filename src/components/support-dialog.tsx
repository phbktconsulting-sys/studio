
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface SupportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const supportCategories = [
    "Technical Issue",
    "Billing Inquiry",
    "Feature Request",
    "General Question",
    "Bug Report",
];

export function SupportDialog({ isOpen, onClose }: SupportDialogProps) {
  const { toast } = useToast();
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !query) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select a category and enter your query.',
      });
      return;
    }

    setIsSubmitting(true);

    // Simulate an API call
    setTimeout(() => {
      console.log('Support Request:', { category, query });
      toast({
        title: 'Request Submitted',
        description: 'Your support request has been sent. We will get back to you shortly.',
      });
      setIsSubmitting(false);
      setCategory('');
      setQuery('');
      onClose();
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit a Support Request</DialogTitle>
          <DialogDescription>
            Have a question or need help? Fill out the form below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category..." />
                </SelectTrigger>
                <SelectContent>
                    {supportCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                        {cat}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="query">Query</Label>
                <Textarea
                id="query"
                placeholder="Please describe your issue or question in detail..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-h-[120px]"
                />
            </div>
            </div>
            <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !category || !query}>
                {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
