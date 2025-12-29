
'use client';

import { useMemo, useState, useEffect } from 'react';
import type { Note, User, GlobalNote } from '@/lib/types';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, getDocs }from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { format } from 'date-fns';

const NotesTable = ({ notes, usersMap, title, isLoading }: { notes: (Note)[], usersMap: Map<string, string>, title: string, isLoading: boolean }) => {
  const getCleanedNoteText = (note: Note) => {
    const noteText = note.text;
    
    // List of all possible system-generated prefixes.
    const prefixes = [
        "Work item resolved.",
        "Case cloned to new work item:",
        "Work resumed from pending status.",
        "Work item taken over from",
        "Work item reallocated to",
        "Work item allocated to",
        "Reason:", // For Terminated notes
        "Pend until:", // For Pended notes
        "Case re-indexed to new Case ID:", // For Re-indexed notes
        /Reason:.*?\./, // Regex for more complex pend/terminate reasons
        /Case re-indexed to new Process.*?\. /,
        /Original Case ID:.*?\. /
    ];

    let cleanedText = noteText;

    for (const prefix of prefixes) {
        if (typeof prefix === 'string' && cleanedText.includes(prefix)) {
            cleanedText = cleanedText.substring(cleanedText.indexOf(prefix) + prefix.length).trim();
        } else if (prefix instanceof RegExp) {
             cleanedText = cleanedText.replace(prefix, '').trim();
        }
    }
    
    // A final check in case the note consists only of system text
    if (cleanedText.startsWith(noteText)) {
        const parts = cleanedText.split('. ');
        if (parts.length > 1) {
            return parts.slice(1).join('. ').trim();
        }
    }

    return cleanedText || noteText;
  };
  

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground text-xs">Category</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground text-xs">Subject</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground text-xs">Note</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground text-xs">Added By</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground text-xs">Date/Time</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="p-4 text-center text-xs">Loading notes...</td></tr>}
              {notes && notes.map((note) => (
                <tr key={note.id} className="border-b">
                  <td className="p-2 align-middle font-medium text-xs">{note.category}</td>
                  <td className="p-2 align-middle font-medium text-xs">{note.subject}</td>
                  <td className="p-2 align-middle text-xs">{getCleanedNoteText(note)}</td>
                  <td className="p-2 align-middle font-medium text-xs">{usersMap.get(note.authorId) || (note as Note).author || 'System'}</td>
                  <td className="p-2 align-middle text-xs">{format(new Date(note.createdAt), 'dd MMM yyyy HH:mm:ss')}</td>
                </tr>
              ))}
              {notes && notes.length === 0 && !isLoading && (
                 <tr>
                    <td colSpan={5} className="p-4 text-center text-xs text-muted-foreground">
                      No matching data was found.
                    </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};


export function NotesTab({ workItemId }: { workItemId: string }) {
  const { firestore } = useFirebase();
  const [usersMap, setUserMap] = useState<Map<string, string>>(new Map());

  // Fetch Work Item Notes
  const workItemNotesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, `work_items/${workItemId}/notes`), orderBy('createdAt', 'desc'));
  }, [firestore, workItemId]);

  const { data: workItemNotes, isLoading: isLoadingWorkItemNotes } = useCollection<Note>(workItemNotesQuery);

  useEffect(() => {
    const fetchNoteAuthors = async () => {
      const allNotes = [...(workItemNotes || [])];
      if (!firestore || !allNotes || allNotes.length === 0) return;
      
      const authorIds = [...new Set(allNotes.map(note => note.authorId).filter(id => id && id !== 'system'))];
      
      if (authorIds.length === 0) return;

      const newUsersMap = new Map<string, string>(usersMap);
      const idsToFetch = authorIds.filter(id => !newUsersMap.has(id));

      if (idsToFetch.length === 0) return;
      
      try {
        const usersRef = collection(firestore, 'users');
        const chunks = [];
        for (let i = 0; i < idsToFetch.length; i += 30) {
          chunks.push(idsToFetch.slice(i, i + 30));
        }

        for (const chunk of chunks) {
            const q = query(usersRef, where('uid', 'in', chunk));
            const querySnapshot = await getDocs(q);

            querySnapshot.forEach((doc) => {
              const userData = doc.data() as User;
              newUsersMap.set(userData.uid, userData.displayName || 'Unknown User');
            });
        }
        setUserMap(newUsersMap);

      } catch (error) {
          console.error("Error fetching note authors:", error)
      }
    };

    fetchNoteAuthors();
  }, [workItemNotes, firestore, usersMap]);


  return (
    <div className="space-y-6">
      <NotesTable 
        notes={workItemNotes || []} 
        usersMap={usersMap} 
        title="Notes" 
        isLoading={isLoadingWorkItemNotes} 
      />
    </div>
  );
}
