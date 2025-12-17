
'use client';

import { useMemo, useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { Customer } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, Search, Mail, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from './ui/input';

interface CustomerWorkflowProps {
  onBack: () => void;
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
              placeholder="Search by name, email, or ID..."
              className="w-full pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
          />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredCustomers &&
          filteredCustomers.map((customer) => (
            <Card key={customer.id} className="group flex flex-col justify-between transition-all hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold">{customer.name || 'N/A'}</CardTitle>
                     <p className="font-mono text-xs text-muted-foreground">{customer.customerUniqueId}</p>
                  </div>
                   <UserCircle className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <a href={`mailto:${customer.email}`} className="text-primary hover:underline truncate">
                        {customer.email}
                    </a>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
       {(!filteredCustomers || filteredCustomers.length === 0) && !isLoading && (
            <div className="mt-6 text-center text-sm text-muted-foreground">
                <p>{searchTerm ? "No customers match your search." : "No customers found."}</p>
            </div>
        )}
    </div>
  );
}
