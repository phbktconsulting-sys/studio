'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { User } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface OfferManagementProps {
  onBack: () => void;
}

export function OfferManagement({ onBack }: OfferManagementProps) {
  const { firestore } = useFirebase();
  const router = useRouter();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: users, isLoading } = useCollection<User>(usersQuery);

  const sortedUsers = useMemo(() => {
    if (!users) return [];
    return [...users].sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
  }, [users]);
  
  const handleGenerateOffer = (userId: string) => {
    router.push(`/offer-letter/${userId}`);
  };

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
              <h1 className="font-headline text-2xl font-bold tracking-tight">Offer Letters</h1>
              <p className="text-muted-foreground">Generate offer letters for users.</p>
            </div>
          </div>
        </div>
        <div className="mt-6 rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Employee ID</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead className="w-[150px]">Role</TableHead>
                <TableHead className="w-[180px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers &&
                sortedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-xs">{user.employeeId}</TableCell>
                    <TableCell className="font-medium">{user.displayName}</TableCell>
                    <TableCell>{user.jobTitle}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'Admin' ? 'destructive' : 'secondary'}>{user.role}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="outline" size="sm" onClick={() => handleGenerateOffer(user.id)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Generate Offer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
