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
import { useToast } from '@/hooks/use-toast';
import { LeadCaptureSchema, type LeadCaptureFormValues } from '@/lib/types';
import { createWorkItem } from '@/ai/flows/create-work-item-flow';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

export default function LeadCapturePage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<LeadCaptureFormValues>({
    resolver: zodResolver(LeadCaptureSchema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      overview: '',
    },
  });

  const onSubmit = async (data: LeadCaptureFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        process: "New Business Request",
        urgency: 'Medium',
        // A generic ID for unauthenticated submissions
        assignedTo: "New Business Request", 
        createdBy: "public_lead_capture_form", 
        relatedContact: {
          name: data.customerName,
          email: data.customerEmail,
          phone: data.customerPhone,
        },
        overview: data.overview,
        tasks: [], // No initial tasks for public leads
      };
      
      const result = await createWorkItem(payload);

      if (result.id && result.customId) {
        toast({
          title: 'Lead Submitted Successfully!',
          description: `Thank you for your interest. We will get back to you shortly. Your reference ID is ${result.customId}.`,
        });
        setIsSubmitted(true);
        form.reset();
      } else {
        throw new Error(result.error || 'An unknown error occurred.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || 'Could not submit your request. Please try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isSubmitted) {
      return (
        <div className="container mx-auto max-w-2xl p-4 sm:p-8">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Thank You!</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Your request has been submitted successfully. A representative will contact you soon. You can now close this page.</p>
                </CardContent>
            </Card>
        </div>
      )
  }

  return (
    <div className="container mx-auto max-w-2xl p-4 sm:p-8">
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Contact Us</CardTitle>
                <CardDescription>
                    Please fill out the form below and one of our representatives will get in touch with you shortly.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                     <FormField
                        control={form.control}
                        name="customerName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="customerEmail"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                    <Input type="email" {...field} />
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
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="overview"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>How can we help you?</FormLabel>
                                <FormControl>
                                    <Textarea {...field} placeholder="Please describe your requirements..." className="min-h-24" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSubmitting ? 'Submitting...' : 'Submit Request'}
                        </Button>
                    </div>
                </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
}
