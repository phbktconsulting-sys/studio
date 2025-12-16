
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
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
import { useFirebase } from '@/firebase';
import { useTabs } from '@/contexts/tab-context';
import { WorkItemCreateSchema, type WorkItemFormValues } from '@/lib/types';
import { createWorkItem } from '@/ai/flows/create-work-item-flow';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const processTypes = [
  'Request Information',
  'Request Quotation',
  'Request Application',
  'Request Website',
  'Request inquiry',
  'Request Backend Support',
  'Request Other',
];

const initialTaskOptions = [
    'Follow up with customer',
    'Gather required documents',
    'Process application',
    'Send quotation',
    'Schedule a meeting',
    'Verify information',
    'Update customer records',
    'Escalate to manager',
    'Prepare report',
    'Close work item'
];

export function NewWorkItemView() {
  const { user } = useFirebase();
  const { openTab, closeTab } = useTabs();
  const { toast } = useToast();

  const form = useForm<WorkItemFormValues>({
    resolver: zodResolver(WorkItemCreateSchema),
    defaultValues: {
      process: 'Request Information',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerPhoneSecondary: '',
      customerAddress: '',
      urgency: 'Medium',
      overview: '',
      task: '',
    },
  });

  const onSubmit = async (data: WorkItemFormValues) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to create a work item.',
      });
      return;
    }

    try {
      const payload = {
        process: data.process,
        urgency: data.urgency,
        assignedTo: user.uid,
        createdBy: user.uid,
        relatedContact: {
          name: data.customerName,
          email: data.customerEmail,
          phone: data.customerPhone,
          phoneSecondary: data.customerPhoneSecondary || '',
          address: data.customerAddress || '',
        },
        overview: data.overview,
        tasks: data.task ? [{ id: `task-${Date.now()}`, text: data.task, completed: false }] : [],
      };
      
      const result = await createWorkItem(payload);

      if (result.id && result.customId) {
        toast({
          title: 'Work Item Created',
          description: `Work item "${result.customId}" has been successfully created.`,
        });

        form.reset();
        closeTab('new-work-item');
        openTab({
          id: result.id,
          title: result.customId,
          type: 'work-item',
        });
      } else {
        throw new Error(result.error || 'An unknown error occurred.');
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error Creating Work Item',
        description: e.message || 'An unexpected error occurred.',
      });
    }
  };

  const handleCancel = () => {
    closeTab('new-work-item');
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={handleCancel}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div>
          <h1 className="font-headline text-base font-bold tracking-tight">Create New Work Item</h1>
          <p className="text-xs text-muted-foreground">Fill out the details below to create a new work item.</p>
        </div>
      </div>
       <Card>
        <CardHeader>
           <CardTitle className="text-sm">Work Item Details</CardTitle>
        </CardHeader>
        <CardContent>
           <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                 <FormField
                  control={form.control}
                  name="process"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Process</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {processTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="urgency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Urgency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
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
                 <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Customer Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

               <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="customerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Customer Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                        />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="customerPhoneSecondary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Customer Phone Secondary</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="customerAddress"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel className="text-xs">Customer Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter customer's full address"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="overview"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel className="text-xs">Overview / Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                    control={form.control}
                    name="task"
                    render={({ field }) => (
                      <FormItem className="md:col-span-1">
                        <FormLabel className="text-xs">Initial Task</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an initial task (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {initialTaskOptions.map((task) => (
                              <SelectItem key={task} value={task}>
                                {task}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit">Create Work Item</Button>
              </div>
            </form>
          </Form>
        </CardContent>
       </Card>
    </div>
  );
}
