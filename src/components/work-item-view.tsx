'use client';

import { useMemo, useState } from 'react';
import type { Note, Task, WorkItem, User } from '@/lib/types';
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
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Briefcase, Mail, Phone, User as UserIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useFirebase, useDoc, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
    return [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notes]);


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add a Note</CardTitle>
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
          <CardTitle>Activity</CardTitle>
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
              {sortedNotes && sortedNotes.map((note) => (
                <TableRow key={note.id}>
                  <TableCell className="font-medium">{note.author}</TableCell>
                  <TableCell>{note.text}</TableCell>
                  <TableCell>{format(new Date(note.createdAt), 'dd MMM yyyy HH:mm:ss')}</TableCell>
                </TableRow>
              ))}
              {sortedNotes.length === 0 && !isLoading && (
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

function StatusBadge({ status }: { status: WorkItem['status'] }) {
  const colorClass =
    status === 'Open'
      ? 'bg-blue-500 hover:bg-blue-600'
      : status === 'In Progress'
      ? 'bg-yellow-500 hover:bg-yellow-600'
      : status === 'Pending'
      ? 'bg-orange-500 hover:bg-orange-600'
      : 'bg-gray-500 hover:bg-gray-600';

  return (
    <Badge variant="default" className={`border-transparent text-primary-foreground ${colorClass}`}>
      {status}
    </Badge>
  );
};


export function WorkItemView({ workItemId, customId }: { workItemId: string, customId: string }) {
  const { firestore } = useFirebase();

  const workItemRef = useMemoFirebase(() => {
      if (!firestore) return null;
      return doc(firestore, 'work_items', workItemId);
  }, [firestore, workItemId]);

  const { data: item, isLoading: isWorkItemLoading } = useDoc<WorkItem>(workItemRef);
  
  const assignedUserRef = useMemoFirebase(() => {
    if (!firestore || !item?.assignedTo) return null;
    return doc(firestore, 'users', item.assignedTo);
  }, [firestore, item?.assignedTo]);

  const { data: assignedUser, isLoading: isUserLoading } = useDoc<User>(assignedUserRef);

  const isLoading = isWorkItemLoading || isUserLoading;

  const priorityMap = {
    High: 1,
    Medium: 5,
    Low: 10,
  };


  if (isLoading || !item) {
    return (
       <div className="flex h-full w-full items-center justify-center p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  const PlaceholderContent = ({ title }: { title: string }) => (
    <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 p-6">
      <p className="text-muted-foreground">{title} (Not Implemented)</p>
    </div>
  );

  return (
    <div className="flex h-full flex-col bg-slate-100">
       <header className="flex flex-col gap-2 border-b bg-card p-4">
        <div className="flex items-center gap-4 text-sm font-medium">
          <Briefcase className="h-5 w-5 text-muted-foreground" />
          <span className="font-headline text-lg">{item.process}</span>
          <Separator orientation="vertical" className="h-5" />
          <span>Status: <span className="text-muted-foreground">{item.status}</span></span>
          <Separator orientation="vertical" className="h-5" />
          <span>Priority: <span className="text-muted-foreground">{priorityMap[item.urgency]}</span></span>
        </div>
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <span>Created: {format(parseISO(item.createdAt), 'dd/MM/yyyy HH:mm')}</span>
          <span>Inbound Method: Manual</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
         <div className="mb-4 space-y-2">
            <h2 className="text-lg font-semibold">Processes</h2>
            <Separator />
            <div className="flex items-center gap-4 text-sm">
                <span className="font-medium">Assigned To:</span>
                <span>{assignedUser?.displayName || '...'}</span>
                <Button variant="secondary" size="sm">Verify Customer Authority</Button>
            </div>
         </div>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="work-item-tabs-list">
            <TabsTrigger value="overview" className="work-item-tabs-trigger">Work Overview</TabsTrigger>
            <TabsTrigger value="notes" className="work-item-tabs-trigger">Notes</TabsTrigger>
            <TabsTrigger value="contact" className="work-item-tabs-trigger">Contact Info</TabsTrigger>
            <TabsTrigger value="images" className="work-item-tabs-trigger">Images</TabsTrigger>
            <TabsTrigger value="associations" className="work-item-tabs-trigger">Associations</TabsTrigger>
            <TabsTrigger value="tasks" className="work-item-tabs-trigger">Tasks</TabsTrigger>
            <TabsTrigger value="policy" className="work-item-tabs-trigger">Policy</TabsTrigger>
            <TabsTrigger value="agency" className="work-item-tabs-trigger">Agency</TabsTrigger>
          </TabsList>
          
          <div className="mt-0 border-t-4 border-[#A60A0A] bg-card p-4">
            <TabsContent value="overview" className="mt-0">
              <Card className="border-0 shadow-none">
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                  <CardContent className="pt-4">
                    <p className="text-muted-foreground">{item.overview}</p>
                  </CardContent>
                </CardHeader>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-0">
              <NotesTab workItemId={item.id} />
            </TabsContent>

            <TabsContent value="contact" className="mt-0">
              <Card className="border-0 shadow-none">
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                      <UserIcon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Name:</span>
                      <span>{item.relatedContact.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Email:</span>
                      <a href={`mailto:${item.relatedContact.email}`} className="text-primary hover:underline">{item.relatedContact.email}</a>
                  </div>
                  <div className="flex items-center gap-4">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Phone:</span>
                      <span>{item.relatedContact.phone}</span>
                  </div>
                  {item.relatedContact.phoneSecondary && (
                    <div className="flex items-center gap-4">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">Secondary Phone:</span>
                        <span>{item.relatedContact.phoneSecondary}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks" className="mt-0">
              <TasksTab tasks={item.tasks} />
            </TabsContent>

            <TabsContent value="images" className="mt-0">
              <PlaceholderContent title="Images" />
            </TabsContent>
            <TabsContent value="associations" className="mt-0">
              <PlaceholderContent title="Associations" />
            </TabsContent>
            <TabsContent value="policy" className="mt-0">
              <PlaceholderContent title="Policy" />
            </TabsContent>
            <TabsContent value="agency" className="mt-0">
              <PlaceholderContent title="Agency" />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
