
'use client';

import { useMemo, useState } from 'react';
import type { Note } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
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
  const { firestore, user } = useFirebase();
  const [noteText, setNoteText] = useState('');

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

  const handleAddNote = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (noteText.trim() && user && firestore) {
      const notesCollectionRef = collection(firestore, `work_items/${workItemId}/notes`);
      addDocumentNonBlocking(notesCollectionRef, {
        authorId: user.uid,
        text: noteText,
        createdAt: new Date().toISOString(),
        workItemId: workItemId,
      });
      setNoteText('');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a Note</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddNote} className="space-y-4">
            <Textarea
              name="note-text"
              placeholder="Type your note here."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <Button type="submit">Save Note</Button>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Author</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="w-[250px]">Date/Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={3}>Loading notes...</TableCell></TableRow>}
              {notes && notes.map((note) => (
                <TableRow key={note.id}>
                  <TableCell className="font-medium">{userMap.get(note.authorId) || 'System'}</TableCell>
                  <TableCell>{note.text}</TableCell>
                  <TableCell>{format(new Date(note.createdAt), 'dd MMM yyyy HH:mm:ss')}</TableCell>
                </TableRow>
              ))}
              {notes && notes.length === 0 && !isLoading && (
                 <TableRow>
                    <TableCell colSpan={3} className="text-center">
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
