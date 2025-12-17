
'use client';

import { useMemo, useState, useEffect } from 'react';
import type { Note, User } from '@/lib/types';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, getDocs } from 'firebase/firestore';
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
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map());

  const notesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, `work_items/${workItemId}/notes`), orderBy('createdAt', 'desc'));
  }, [firestore, workItemId]);

  const { data: notes, isLoading } = useCollection<Note>(notesQuery);

  useEffect(() => {
    const fetchNoteAuthors = async () => {
      if (!firestore || !notes || notes.length === 0) return;

      const authorIds = [...new Set(notes.map(note => note.authorId).filter(id => id && id !== 'system'))];
      if (authorIds.length === 0) return;

      const newUsersMap = new Map<string, string>(userMap);
      const idsToFetch = authorIds.filter(id => !newUsersMap.has(id));

      if (idsToFetch.length === 0) return;
      
      try {
        const usersRef = collection(firestore, 'users');
        // Firestore 'in' query is limited to 30 items per query.
        // For larger sets of authors, batching would be needed.
        const q = query(usersRef, where('uid', 'in', idsToFetch.slice(0,30)));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
          const userData = doc.data() as User;
          newUsersMap.set(userData.uid, userData.displayName || 'Unknown User');
        });

        setUserMap(newUsersMap);

      } catch (error) {
          console.error("Error fetching note authors:", error)
      }
    };

    fetchNoteAuthors();
  }, [notes, firestore, userMap]);


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
                <TableHead className="w-[150px] text-xs">Category</TableHead>
                <TableHead className="w-[150px] text-xs">Subject</TableHead>
                <TableHead className="text-xs">Note</TableHead>
                <TableHead className="w-[200px] text-xs">Added By</TableHead>
                <TableHead className="w-[200px] text-xs">Date/Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="py-1 px-4 text-xs">Loading notes...</TableCell></TableRow>}
              {notes && notes.map((note) => (
                <TableRow key={note.id}>
                  <TableCell className="font-medium py-1 px-4 text-xs">{note.category}</TableCell>
                  <TableCell className="font-medium py-1 px-4 text-xs">{note.subject}</TableCell>
                  <TableCell className="py-1 px-4 text-xs">{note.text}</TableCell>
                  <TableCell className="font-medium py-1 px-4 text-xs">{userMap.get(note.authorId) || note.author}</TableCell>
                  <TableCell className="py-1 px-4 text-xs">{format(new Date(note.createdAt), 'dd MMM yyyy HH:mm:ss')}</TableCell>
                </TableRow>
              ))}
              {notes && notes.length === 0 && !isLoading && (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center py-1 px-4 text-xs">
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
