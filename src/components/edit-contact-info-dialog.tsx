
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  ContactInfoUpdateSchema,
  type ContactInfoUpdateValues,
  type WorkItem,
} from '@/lib/types';
import { useEffect, useState } from 'react';

interface EditContactInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contactInfo: WorkItem['relatedContact'];
  onSave: (data: ContactInfoUpdateValues) => void;
}

export function EditContactInfoDialog({
  isOpen,
  onClose,
  contactInfo,
  onSave,
}: EditContactInfoDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<ContactInfoUpdateValues>({
    resolver: zodResolver(ContactInfoUpdateSchema),
    defaultValues: {
      name: '',
      address: '',
      email: '',
      phone: '',
      aadharNumber: '',
      panNumber: '',
      businessName: '',
      businessSize: '',
      businessRevenue: '',
      hasOtherProvider: false,
    },
  });

  useEffect(() => {
    if (contactInfo) {
      form.reset({
        name: contactInfo.name || '',
        address: contactInfo.address || '',
        email: contactInfo.email || '',
        phone: contactInfo.phone || '',
        aadharNumber: contactInfo.aadharNumber || '',
        panNumber: contactInfo.panNumber || '',
        businessName: contactInfo.businessName || '',
        businessSize: contactInfo.businessSize || '',
        businessRevenue: contactInfo.businessRevenue || '',
        hasOtherProvider: contactInfo.hasOtherProvider || false,
      });
    }
  }, [contactInfo, form]);

  const handleSubmit = (data: ContactInfoUpdateValues) => {
    setIsSubmitting(true);
    onSave(data);
    // isSubmitting will be reset by parent component logic if needed, or dialog closes
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Customer Information</DialogTitle>
          <DialogDescription>
            Update the contact and business details for this customer.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="aadharNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aadhar Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="panNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PAN Card Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Business Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="businessSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Business Size</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 1-10 employees" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="businessRevenue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Revenue</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., $100,000 USD" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="hasOtherProvider"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-auto">
                    <div className="space-y-0.5">
                       <FormLabel>Using another provider?</FormLabel>
                        <FormMessage />
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
