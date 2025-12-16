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
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserManagementProps {
  onBack: () => void;
}

export function UserManagement({ onBack }: UserManagementProps) {
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
  
  const handleRowClick = (userId: string) => {
    router.push(`/users/${userId}`);
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
              <h1 className="font-headline text-lg font-bold tracking-tight">User Management</h1>
              <p className="text-xs text-muted-foreground">View and manage all users.</p>
            </div>
          </div>
          <Button asChild>
            <Link href="/users/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create User
            </Link>
          </Button>
        </div>
        <div className="mt-6 rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px] text-xs">Employee ID</TableHead>
                <TableHead className="text-xs">Display Name</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="w-[150px] text-xs">Role</TableHead>
                <TableHead className="w-[180px] text-xs">User ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers &&
                sortedUsers.map((user) => (
                  <TableRow key={user.id} onClick={() => handleRowClick(user.id)} className="cursor-pointer">
                    <TableCell className="font-mono text-xs py-1 px-4">{user.employeeId}</TableCell>
                    <TableCell className="font-medium text-xs py-1 px-4">{user.displayName}</TableCell>
                    <TableCell className="text-xs py-1 px-4">{user.email}</TableCell>
                    <TableCell className="text-xs py-1 px-4">
                      <Badge variant={user.role === 'Admin' ? 'destructive' : 'secondary'}>{user.role}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs py-1 px-4">{user.uid}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
