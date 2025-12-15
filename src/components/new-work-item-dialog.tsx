'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';

const workItemSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters.'),
  customerName: z.string().min(2, 'Customer name is required.'),
  customerEmail: z.string().email('Invalid email address.'),
  customerPhone: z.string().optional(),
  urgency: z.enum(['Low', 'Medium', 'High']),
  overview: z.string().min(10, 'Overview must be at least 10 characters.'),
});

type WorkItemFormValues = z.infer<typeof workItemSchema>;

interface NewWorkItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewWorkItemDialog({ open, onOpenChange }: NewWorkItemDialogProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const form = useForm<WorkItemFormValues>({
    resolver: zodResolver(workItemSchema),
    defaultValues: {
      subject: '',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      urgency: 'Medium',
      overview: '',
    },
  });

  const onSubmit = (data: WorkItemFormValues) => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to create a work item.',
      });
      return;
    }

    const workItemsCollection = collection(firestore, 'work_items');
    
    addDocumentNonBlocking(workItemsCollection, {
        subject: data.subject,
        status: 'Open',
        urgency: data.urgency,
        assignedTo: user.uid,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        relatedContact: {
            name: data.customerName,
            email: data.customerEmail,
            phone: data.customerPhone || '',
        },
        overview: data.overview,
        tasks: []
    });

    toast({
      title: 'Work Item Created',
      description: `Work item "${data.subject}" has been successfully created.`,
    });

    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Create New Work Item</DialogTitle>
          <DialogDescription>
            Fill out the details below to create a new work item.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Fix leaking faucet" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="urgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Urgency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select urgency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
               <FormField
                control={form.control}
                name="customerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john.doe@example.com" {...field} />
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
                    <FormLabel>Customer Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="555-123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>


            <FormField
              control={form.control}
              name="overview"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overview / Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide a detailed description of the work to be done."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit">Create Work Item</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
