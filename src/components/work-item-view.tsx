'use client';

import { getNotesForWorkItem, getWorkItemById } from '@/lib/data';
import type { Note, Task, WorkItem } from '@/lib/types';
import { useEffect, useState } from 'react';
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

function NotesTab({ workItemId }: { workItemId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  useEffect(() => {
    setNotes(getNotesForWorkItem(workItemId));
  }, [workItemId]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Add a Note</h3>
        <Textarea placeholder="Type your note here." className="mt-2" />
        <Button className="mt-2">Save Note</Button>
      </div>
      <Separator />
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Activity</h3>
        {notes.map((note) => (
          <Card key={note.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{note.author}</CardTitle>
              <CardDescription>{format(new Date(note.createdAt), 'PPpp')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{note.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TasksTab({ tasks }: { tasks: Task[] }) {
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
  const [item, setItem] = useState<WorkItem | null>(null);

  useEffect(() => {
    setItem(getWorkItemById(workItemId));
  }, [workItemId]);

  if (!item) {
    return <div className="p-6">Loading work item...</div>;
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
