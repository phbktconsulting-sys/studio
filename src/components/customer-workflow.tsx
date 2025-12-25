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
import { ArrowLeft, Mail, Phone, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card } from './ui/card';

interface CustomerWorkflowProps {
  onBack: () => void;
}

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="0"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16.75 13.96c.25.13.43.2.5.33.07.13.07.55-.02.75-.1.2-.68.65-1.18.83-.5.18-1.1.2-1.58.12-.48-.08-1.13-.3-1.9-.85-.9-.6-1.58-1.35-2.1-2.25-.52-.9-.8-1.88-.8-2.83.02-.43.12-.8.28-1.08.15-.28.38-.45.68-.58.3-.13.6-.13.83-.13.23 0 .45.02.63.07.2.05.3.07.45.4.15.33.53.95.58 1.03.05.08.07.18.02.3-.05.13-.1.2-.23.32-.13.13-.25.22-.38.32-.13.1-.2.18-.28.3-.08.1-.13.2-.08.33.05.13.25.35.5.58.25.23.75.75 1.25 1.08.5.33.7.32.9.3.2-.02.6-.2.8-.4.2-.2.32-.4.4-.58.08-.18.18-.32.32-.4.14-.08.3-.03.45.08zM12 2a10 10 0 0 0-10 10 10 10 0 0 0 10 10 10 10 0 0 0 10-10 10 10 0 0 0-10-10zm0 18a8 8 0 0 1-8-8 8 8 0 0 1 8-8 8 8 0 0 1 8 8 8 8 0 0 1-8 8z" />
  </svg>
);

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

    if (!lowercasedFilter) {
      return sortedCustomers;
    }

    return sortedCustomers.filter((customer) => {
      return (
        customer.name?.toLowerCase().includes(lowercasedFilter) ||
        customer.email?.toLowerCase().includes(lowercasedFilter) ||
        customer.customerUniqueId?.includes(lowercasedFilter)
      );
    });
  }, [sortedCustomers, searchTerm]);

  const clearFilters = () => {
    setSearchTerm('');
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
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
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or ID..."
                className="w-full pl-9 h-8 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {searchTerm && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearFilters}>
                <X className="h-4 w-4" />
                <span className="sr-only">Clear filters</span>
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Total Customers:</span>
            <Badge variant="secondary">{filteredCustomers.length}</Badge>
          </div>
        </div>
      </div>

      <Card className="mt-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer Name</TableHead>
              <TableHead>Customer ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers &&
              filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="py-1 px-4 font-medium">{customer.name || 'N/A'}</TableCell>
                  <TableCell className="py-1 px-4 font-mono text-xs">{customer.customerUniqueId}</TableCell>
                  <TableCell className="py-1 px-4">
                    <a href={`mailto:${customer.email}`} className="text-primary hover:underline">
                      {customer.email}
                    </a>
                  </TableCell>
                  <TableCell className="py-1 px-4">{customer.phone}</TableCell>
                  <TableCell className="py-1 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a href={`https://wa.me/${customer.phone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full text-green-600 hover:bg-green-100">
                        <WhatsAppIcon className="h-5 w-5" />
                        <span className="sr-only">WhatsApp</span>
                      </a>
                      <a href={`mailto:${customer.email}`} className="p-2 rounded-full text-blue-600 hover:bg-blue-100">
                        <Mail className="h-5 w-5" />
                        <span className="sr-only">Email</span>
                      </a>
                      <a href={`tel:${customer.phone}`} className="p-2 rounded-full text-red-600 hover:bg-red-100">
                        <Phone className="h-5 w-5" />
                        <span className="sr-only">Call</span>
                      </a>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        {(!filteredCustomers || filteredCustomers.length === 0) && !isLoading && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <p>{searchTerm ? 'No customers match your search.' : 'No customers found.'}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
