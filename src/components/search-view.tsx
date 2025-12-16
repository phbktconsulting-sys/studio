
'use client';

import { useMemo, useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { WorkItem } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ArrowDown, ArrowRight, ChevronUp, Search as SearchIcon } from 'lucide-react';
import { useTabs } from '@/contexts/tab-context';
import { format } from 'date-fns';
import { Input } from './ui/input';
import { Button } from './ui/button';

const UrgencyIcon = ({ urgency }: { urgency: WorkItem['urgency'] }) => {
  switch (urgency) {
    case 'High':
      return <ChevronUp className="h-5 w-5 text-red-500" />;
    case 'Medium':
      return <ArrowRight className="h-5 w-5 text-yellow-500" />;
    case 'Low':
      return <ArrowDown className="h-5 w-5 text-green-500" />;
    default:
      return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
  }
};

const StatusBadge = ({ status }: { status: WorkItem['status'] }) => {
  const colorClass =
    status === 'Open'
      ? 'bg-blue-500 hover:bg-blue-600'
      : status === 'In Progress'
      ? 'bg-yellow-500 hover:bg-yellow-600'
      : status === 'Pending'
      ? 'bg-orange-500 hover:bg-orange-600'
      : status === 'Re-indexed'
      ? 'bg-purple-500 hover:bg-purple-600'
      : 'bg-gray-500 hover:bg-gray-600';

  return (
    <Badge variant="default" className={`border-transparent text-primary-foreground ${colorClass}`}>
      {status}
    </Badge>
  );
};

export function SearchView() {
  const { firestore } = useFirebase();
  const { openTab } = useTabs();
  const [searchTerm, setSearchTerm] = useState('');
  const [queryValue, setQueryValue] = useState('');

  const workItemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // Admins can see all, for others this might be restricted by security rules.
    // Assuming for search, we allow broader access or the user is an admin.
    return query(collection(firestore, 'work_items'));
  }, [firestore]);

  const { data: workItems, isLoading } = useCollection<WorkItem>(workItemsQuery);

  const handleRowClick = (item: WorkItem) => {
    openTab({
      id: item.id,
      title: item.customId,
      type: 'work-item',
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQueryValue(searchTerm.toLowerCase().trim());
  };

  const searchResults = useMemo(() => {
    if (!workItems || !queryValue) {
      return [];
    }
    return workItems.filter(item => {
        const contact = item.relatedContact;
        return (
            item.customId.toLowerCase().includes(queryValue) ||
            (contact.phone && contact.phone.includes(queryValue)) ||
            (contact.email && contact.email.toLowerCase().includes(queryValue)) ||
            (contact.customerUniqueId && contact.customerUniqueId.includes(queryValue))
        );
    });
  }, [workItems, queryValue]);


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
        <div>
          <h1 className="font-headline text-lg font-bold tracking-tight">Search Work Items</h1>
          <p className="text-xs text-muted-foreground">Search by Case ID, Email, Phone, or Customer Unique ID.</p>
        </div>
      </div>

       <form onSubmit={handleSearch} className="mt-4 flex items-center gap-2 rounded-lg border bg-card p-2">
        <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                placeholder="Enter search term..."
                className="h-8 w-full pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <Button type="submit" className="h-8">Search</Button>
      </form>

      <div className="mt-6 rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="w-[120px] text-xs">Case ID</TableHead>
              <TableHead className="w-[150px] text-xs">Status</TableHead>
              <TableHead className="text-xs">Subject</TableHead>
              <TableHead className="w-[180px] text-xs">Customer Name</TableHead>
              <TableHead className="w-[180px] text-xs">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {searchResults.length > 0 ? (
              searchResults.map((item) => (
                <TableRow key={item.id} onClick={() => handleRowClick(item)} className="cursor-pointer">
                  <TableCell className="text-center py-1 px-4">
                    <UrgencyIcon urgency={item.urgency} />
                  </TableCell>
                  <TableCell className="font-medium py-1 px-4 text-xs">{item.customId}</TableCell>
                  <TableCell className="py-1 px-4 text-xs">
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="py-1 px-4 text-xs">{item.subject}</TableCell>
                  <TableCell className="py-1 px-4 text-xs">{item.relatedContact.name}</TableCell>
                  <TableCell className="py-1 px-4 text-xs">{format(new Date(item.updatedAt), 'MMM d, yyyy')}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-4 text-xs">
                  {queryValue ? 'No work items match your search.' : 'Enter a search term to begin.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

}
