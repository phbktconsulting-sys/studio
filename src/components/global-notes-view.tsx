
'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Search } from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, collectionGroup } from 'firebase/firestore';
import type { WorkItem, Note, User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

function SearchedNotesList({ notes, isLoading }: { notes: (Note & { workItemCustomId: string })[], isLoading: boolean }) {
  const { firestore } = useFirebase();
  const [usersMap, setUsersMap] = useState<Map<string, string>>(new Map());

  // Effect to fetch author display names
  useMemo(async () => {
    if (!notes || notes.length === 0 || !firestore) return;

    const authorIds = [...new Set(notes.map(note => note.authorId))];
    const idsToFetch = authorIds.filter(id => !usersMap.has(id));

    if (idsToFetch.length > 0) {
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('uid', 'in', idsToFetch.slice(0, 30))); // Slicing to respect 'in' query limit
      const querySnapshot = await getDocs(q);
      const newUsersMap = new Map(usersMap);
      querySnapshot.forEach(doc => {
        const user = doc.data() as User;
        newUsersMap.set(user.uid, user.displayName || 'Unknown User');
      });
      setUsersMap(newUsersMap);
    }
  }, [notes, firestore, usersMap]);


  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  if (notes.length === 0) {
      return (
        <div className="text-center text-sm text-muted-foreground py-10">
            No notes found for this Customer ID.
        </div>
      )
  }

  return (
    <div className="space-y-4">
      {notes.map(note => (
        <Card key={note.id}>
          <CardHeader className="p-4 pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-sm">{note.subject}</CardTitle>
                <CardDescription className="text-xs">
                  From Case: <span className="font-medium text-primary">{note.workItemCustomId}</span>
                </CardDescription>
              </div>
               <p className="text-xs text-muted-foreground">{format(new Date(note.createdAt), 'dd MMM yyyy, HH:mm')}</p>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs">{note.text}</p>
            <p className="text-xs text-muted-foreground mt-2">- {usersMap.get(note.authorId) || note.authorId}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}


export function GlobalNotesView() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  
  // State for adding a note
  const [newNoteCustomerId, setNewNoteCustomerId] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for searching notes
  const [searchCustomerId, setSearchCustomerId] = useState('');
  const [searchedNotes, setSearchedNotes] = useState<(Note & { workItemCustomId: string })[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    if (!newNoteCustomerId.trim() || !newNoteContent.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Customer ID and Note content are required.' });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
        const globalNotesRef = collection(firestore, 'global_notes');
        await addDocumentNonBlocking(globalNotesRef, {
            authorId: user.uid,
            customerUniqueId: newNoteCustomerId.trim(),
            text: newNoteContent.trim(),
            createdAt: new Date().toISOString(),
            subject: 'Global Note',
            category: 'General',
        });

        toast({ title: 'Success', description: 'Global note added successfully.' });
        setNewNoteCustomerId('');
        setNewNoteContent('');

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to add note', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !searchCustomerId.trim()) return;

    setIsSearching(true);
    setSearchedNotes([]);

    try {
        // 1. Find all work items for the given customer ID
        const workItemsRef = collection(firestore, 'work_items');
        const workItemsQuery = query(workItemsRef, where('relatedContact.customerUniqueId', '==', searchCustomerId.trim()));
        const workItemsSnapshot = await getDocs(workItemsQuery);
        
        const workItemsFound = workItemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkItem));
        const workItemIds = workItemsFound.map(item => item.id);
        
        if (workItemIds.length === 0) {
            setSearchedNotes([]);
            setIsSearching(false);
            toast({ title: 'No Results', description: 'No work items found for this customer ID.'});
            return;
        }
        
        // 2. Fetch all notes for those work items using a collectionGroup query
        const notesRef = collectionGroup(firestore, 'notes');
        const notesQuery = query(notesRef, where('workItemId', 'in', workItemIds));
        const notesSnapshot = await getDocs(notesQuery);

        const workItemIdToCustomIdMap = new Map(workItemsFound.map(item => [item.id, item.customId]));

        const allNotes = notesSnapshot.docs.map(doc => {
            const note = doc.data() as Note;
            return {
                ...note,
                id: doc.id,
                workItemCustomId: workItemIdToCustomIdMap.get(note.workItemId) || 'N/A'
            };
        });
        
        // 3. Sort and set the notes
        allNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSearchedNotes(allNotes);

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Search Failed', description: error.message });
    } finally {
        setIsSearching(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Add Note Section */}
      <Card>
        <CardHeader>
          <CardTitle>Add Global Note</CardTitle>
          <CardDescription>Add a note associated with a Customer ID.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddNote} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="customer-id-add">Customer Unique ID</Label>
              <Input 
                id="customer-id-add" 
                placeholder="Enter Customer ID..."
                value={newNoteCustomerId}
                onChange={e => setNewNoteCustomerId(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="note-content">Note</Label>
              <Textarea
                id="note-content"
                placeholder="Enter note content..."
                value={newNoteContent}
                onChange={e => setNewNoteContent(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Note'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Search Notes Section */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Search Customer Notes</CardTitle>
            <CardDescription>Find all notes related to a customer across all their work items.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Enter Customer ID to search..."
                  className="pl-9"
                  value={searchCustomerId}
                  onChange={e => setSearchCustomerId(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={isSearching}>
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {/* Search Results */}
        <div className="max-h-[60vh] overflow-y-auto pr-2">
             <SearchedNotesList notes={searchedNotes} isLoading={isSearching} />
        </div>
      </div>
    </div>
  );
}
