'use client';

import { useMemo, useState } from 'react';
import type { Note, Task, WorkItem } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Phone, User } from 'lucide-react';
import { format } from 'date-fns';
import { useFirebase, useDoc, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';

function NotesTab({ workItemId }: { workItemId: string }) {
  const { firestore, user } = useFirebase();
  const [noteText, setNoteText] = useState('');

  const notesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `work_items/${workItemId}/notes`);
  }, [firestore, workItemId]);

  const { data: notes, isLoading } = useCollection<Note>(notesQuery);

  const handleAddNote = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (noteText.trim() && user && firestore) {
      const notesCollectionRef = collection(firestore, `work_items/${workItemId}/notes`);
      addDocumentNonBlocking(notesCollectionRef, {
        authorId: user.uid,
        // Fallback to email if displayName is not available
        author: user.displayName || user.email || 'Anonymous',
        text: noteText,
        createdAt: new Date().toISOString(),
        workItemId: workItemId,
      });
      setNoteText('');
    }
  };
  
   const sortedNotes = useMemo(() => {
    if (!notes) return [];
    // Ensure createdAt is a valid date for sorting
    return [...notes].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
    });
  }, [notes]);


  return (
    <div className="space-y-6">
      <form onSubmit={handleAddNote}>
        <h3 className="text-lg font-medium">Add a Note</h3>
        <Textarea 
          name="note-text" 
          placeholder="Type your note here." 
          className="mt-2"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
        />
        <Button type="submit" className="mt-2">Save Note</Button>
      </form>
      <Separator />
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Activity</h3>
        {isLoading && <p>Loading notes...</p>}
        {sortedNotes && sortedNotes.map((note) => (
          <Card key={note.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{note.author}</CardTitle>
              {note.createdAt && (
                <CardDescription>{format(new Date(note.createdAt), 'PPpp')}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{note.text}</p>
            </CardContent>
          </Card>
        ))}
        {sortedNotes.length === 0 && !isLoading && <p>No notes have been added yet.</p>}
      </div>
    </div>
  );
}

function TasksTab({ tasks }: { tasks: Task[] }) {
  if (!tasks || tasks.length === 0) {
    return <p>No tasks for this work item.</p>;
  }

  return (
    <div className="space-y-4">
       {tasks.map((task) => (
          <div key={task.id} className="flex items-center space-x-3 rounded-md border p-4">
            <Checkbox id={`task-${task.id}`} checked={task.completed} />
            <label
              htmlFor={`task-${task.id}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {task.text}
            </label>
          </div>
        ))}
    </div>
  );
}


export function WorkItemView({ workItemId }: { workItemId: string }) {
  const { firestore } = useFirebase();

  const workItemRef = useMemoFirebase(() => {
      if (!firestore) return null;
      return doc(firestore, 'work_items', workItemId);
  }, [firestore, workItemId]);
  
  const { data: item, isLoading } = useDoc<WorkItem>(workItemRef);


  if (isLoading || !item) {
    return (
       <div className="flex h-full w-full items-center justify-center p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b bg-card p-4">
        <div>
          <h1 className="font-headline text-2xl font-bold">{item.subject}</h1>
          <p className="text-sm text-muted-foreground">Work Item ID: WI-{item.id.slice(0, 4)}</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline">{item.urgency} Urgency</Badge>
          <Badge>{item.status}</Badge>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <Accordion type="single" collapsible className="mb-6 w-full" defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger className="font-headline text-lg">Processes</AccordionTrigger>
            <AccordionContent>
              Process steps and related actions can be displayed here. (Not Implemented)
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Work Overview</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="contact">Contact Info</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{item.overview}</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="notes" className="mt-4">
             <NotesTab workItemId={item.id} />
          </TabsContent>
          <TabsContent value="contact" className="mt-4">
             <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <span>{item.relatedContact.name}</span>
                </div>
                 <div className="flex items-center gap-4">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <a href={`mailto:${item.relatedContact.email}`} className="text-primary hover:underline">{item.relatedContact.email}</a>
                </div>
                 <div className="flex items-center gap-4">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <span>{item.relatedContact.phone}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="tasks" className="mt-4">
            <TasksTab tasks={item.tasks} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
