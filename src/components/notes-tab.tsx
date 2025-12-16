
'use client';

import { useMemo } from 'react';
import type { Note } from '@/lib/types';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { format } from 'date-fns';

export function NotesTab({ workItemId }: { workItemId: string }) {
  const { firestore } = useFirebase();

  const notesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, `work_items/${workItemId}/notes`), orderBy('createdAt', 'desc'));
  }, [firestore, workItemId]);

  const { data: notes, isLoading } = useCollection<Note>(notesQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: users } = useCollection(usersQuery);

  const userMap = useMemo(() => {
    if (!users) return new Map();
    return new Map(users.map((u: any) => [u.uid, u.displayName]));
  }, [users]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Category</TableHead>
                <TableHead className="w-[150px]">Subject</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="w-[200px]">Added By</TableHead>
                <TableHead className="w-[200px]">Date/Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="py-1 px-4">Loading notes...</TableCell></TableRow>}
              {notes && notes.map((note) => (
                <TableRow key={note.id}>
                  <TableCell className="font-medium py-1 px-4">{note.category}</TableCell>
                  <TableCell className="font-medium py-1 px-4">{note.subject}</TableCell>
                  <TableCell className="py-1 px-4">{note.text}</TableCell>
                  <TableCell className="font-medium py-1 px-4">{userMap.get(note.authorId) || 'System'}</TableCell>
                  <TableCell className="py-1 px-4">{format(new Date(note.createdAt), 'dd MMM yyyy HH:mm:ss')}</TableCell>
                </TableRow>
              ))}
              {notes && notes.length === 0 && !isLoading && (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center py-1 px-4">
                      No notes have been added yet.
                    </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
