'use client';

import { useMemo, useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { Customer } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from './ui/input';

interface CustomerWorkflowProps {
  onBack: () => void;
}

// We need a more detailed customer type for this view
interface DetailedCustomer extends Customer {
    name: string;
    phone: string;
    address: string;
}

export function CustomerWorkflow({ onBack }: CustomerWorkflowProps) {
  const { firestore } = useFirebase();
  const [searchTerm, setSearchTerm] = useState('');

  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'customers'));
  }, [firestore]);

  const { data: customers, isLoading } = useCollection<Customer>(customersQuery);

  const sortedCustomers = useMemo(() => {
    if (!customers) return [];
    return [...customers].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    if (!sortedCustomers) return [];
    const lowercasedFilter = searchTerm.toLowerCase();
    return sortedCustomers.filter((customer) => {
      return (
        customer.name?.toLowerCase().includes(lowercasedFilter) ||
        customer.email?.toLowerCase().includes(lowercasedFilter) ||
        customer.phone?.includes(lowercasedFilter) ||
        customer.customerUniqueId?.includes(lowercasedFilter)
      );
    });
  }, [sortedCustomers, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
            <div>
              <h1 className="font-headline text-lg font-bold tracking-tight">Customer Workflow</h1>
              <p className="text-xs text-muted-foreground">View and manage all customer records.</p>
            </div>
          </div>
        </div>
        <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                placeholder="Search by name, email, phone, or ID..."
                className="w-full pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="mt-6 rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px] text-xs">Customer ID</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="w-[150px] text-xs">Phone</TableHead>
                <TableHead className="text-xs">Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers &&
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-mono text-xs py-1 px-4">{customer.customerUniqueId}</TableCell>
                    <TableCell className="font-medium text-xs py-1 px-4">{customer.name}</TableCell>
                    <TableCell className="text-xs py-1 px-4">{customer.email}</TableCell>
                    <TableCell className="text-xs py-1 px-4">{customer.phone}</TableCell>
                     <TableCell className="text-xs py-1 px-4">{customer.address}</TableCell>
                  </TableRow>
                ))}
              {(!filteredCustomers || filteredCustomers.length === 0) && !isLoading && (
                  <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-4 text-xs">
                      {searchTerm ? "No customers match your search." : "No customers found."}
                      </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
