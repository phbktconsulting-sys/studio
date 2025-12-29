
'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Search } from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, or } from 'firebase/firestore';
import type { WorkItem, Note, User, GlobalNote, Customer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

function SearchedNotesList({ notes, isLoading }: { notes: GlobalNote[], isLoading: boolean }) {
  const { firestore } = useFirebase();
  const [usersMap, setUsersMap] = useState<Map<string, string>>(new Map());

  // Effect to fetch author display names
  useMemo(async () => {
    if (!notes || notes.length === 0 || !firestore) return;

    const authorIds = [...new Set(notes.map(note => note.authorId))];
    const idsToFetch = authorIds.filter(id => !usersMap.has(id));

    if (idsToFetch.length > 0) {
      const newUsersMap = new Map(usersMap);
      // Firestore 'in' query is limited to 30 items. Chunking is required for larger sets.
      const chunks = [];
      for (let i = 0; i < idsToFetch.length; i += 30) {
        chunks.push(idsToFetch.slice(i, i + 30));
      }

      for (const chunk of chunks) {
          const usersRef = collection(firestore, 'users');
          const q = query(usersRef, where('uid', 'in', chunk));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach(doc => {
            const user = doc.data() as User;
            newUsersMap.set(user.uid, user.displayName || 'Unknown User');
          });
      }
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
  
  return (
    <Card>
        <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Search Results</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
        <div className="rounded-lg border">
            <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="text-xs">Global Note</TableHead>
                    <TableHead className="text-xs">Customer ID</TableHead>
                    <TableHead className="text-xs">Work Item Number</TableHead>
                    <TableHead className="text-xs">Notes</TableHead>
                    <TableHead className="text-xs">Added By</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {notes.length === 0 && !isLoading && (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-10">
                            No global notes found for this customer.
                        </TableCell>
                    </TableRow>
                )}
                {notes.map(note => (
                    <TableRow key={note.id}>
                        <TableCell className="py-2 text-xs font-medium">{note.subject}</TableCell>
                        <TableCell className="py-2 text-xs">{note.customerUniqueId}</TableCell>
                        <TableCell className="py-2 text-xs">{note.workItemNumber}</TableCell>
                        <TableCell className="py-2 text-xs">{note.text}</TableCell>
                        <TableCell className="py-2 text-xs">{usersMap.get(note.authorId) || note.authorId}</TableCell>
                        <TableCell className="py-2 text-xs">{format(new Date(note.createdAt), 'dd MMM yyyy, HH:mm')}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
        </CardContent>
    </Card>
  );
}


export function GlobalNotesView() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  
  // State for adding a note
  const [newNoteCustomerId, setNewNoteCustomerId] = useState('');
  const [newNoteWorkItemNumber, setNewNoteWorkItemNumber] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for searching notes
  const [searchTerm, setSearchTerm] = useState('');
  const [searchedNotes, setSearchedNotes] = useState<GlobalNote[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    if (!newNoteCustomerId.trim() || !newNoteContent.trim() || !newNoteWorkItemNumber.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Customer ID, Work Item Number, and Note content are required.' });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
        const globalNotesRef = collection(firestore, 'global_notes');
        const newNote: Partial<GlobalNote> = {
            authorId: user.uid,
            customerUniqueId: newNoteCustomerId.trim(),
            text: newNoteContent.trim(),
            createdAt: new Date().toISOString(),
            subject: 'Global Note',
            category: 'General',
            workItemNumber: newNoteWorkItemNumber.trim(),
        };

        await addDocumentNonBlocking(globalNotesRef, newNote);

        toast({ title: 'Success', description: 'Global note added successfully.' });
        setNewNoteCustomerId('');
        setNewNoteWorkItemNumber('');
        setNewNoteContent('');

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to add note', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !searchTerm.trim()) return;

    setIsSearching(true);
    setSearchedNotes([]);

    try {
      const term = searchTerm.trim();

      // 1. Find the customer by unique ID or phone number
      const customersRef = collection(firestore, 'customers');
      const customerQuery = query(customersRef, or(
          where('customerUniqueId', '==', term),
          where('phone', '==', term)
      ));
      const customerSnapshot = await getDocs(customerQuery);
      
      if (customerSnapshot.empty) {
        toast({ title: 'No Customer Found', description: 'No customer found with that ID or mobile number.'});
        setIsSearching(false);
        return;
      }
      
      const customer = customerSnapshot.docs[0].data() as Customer;
      const customerId = customer.customerUniqueId;


      // 2. Fetch Global Notes for the customer
      const globalNotesQuery = query(collection(firestore, 'global_notes'), where('customerUniqueId', '==', customerId));
      const globalNotesSnapshot = await getDocs(globalNotesQuery);
      const globalNotes = globalNotesSnapshot.docs.map(doc => {
        const data = doc.data() as GlobalNote;
        return {
          ...data,
          id: doc.id,
        } as GlobalNote;
      });
      
      // 3. Sort all notes
      const allNotes = [...globalNotes];
      allNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      if (allNotes.length === 0) {
        toast({ title: 'No Results', description: 'No global notes found for this customer.'});
      }

      setSearchedNotes(allNotes);

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Search Failed', description: error.message });
    } finally {
        setIsSearching(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Add Note Section */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Add Global Note</CardTitle>
            <CardDescription className="text-xs">Add a note associated with a Customer ID.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddNote} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                  <Label htmlFor="customer-id-add" className="text-xs">Customer Unique ID *</Label>
                  <Input 
                    id="customer-id-add" 
                    placeholder="Enter Customer ID..."
                    value={newNoteCustomerId}
                    onChange={e => setNewNoteCustomerId(e.target.value)}
                    className="text-xs"
                  />
                </div>
                 <div className="space-y-1">
                  <Label htmlFor="work-item-number" className="text-xs">Work Item Number *</Label>
                  <Input 
                    id="work-item-number" 
                    placeholder="Enter Work Item Number..."
                    value={newNoteWorkItemNumber}
                    onChange={e => setNewNoteWorkItemNumber(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="note-content" className="text-xs">Note *</Label>
                <Textarea
                  id="note-content"
                  placeholder="Enter note content..."
                  value={newNoteContent}
                  onChange={e => setNewNoteContent(e.target.value)}
                  className="min-h-[100px] text-xs"
                />
              </div>
              <Button type="submit" disabled={isSubmitting} size="sm" className="text-xs">
                {isSubmitting ? 'Submitting...' : 'Submit Note'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Search Notes Section */}
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Search Customer Notes</CardTitle>
            <CardDescription className="text-xs">Find all global notes for a customer by their Unique ID or Mobile Number.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Enter Customer ID or Mobile Number..."
                  className="pl-9 text-xs"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={isSearching} size="sm" className="text-xs">
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
