import { z } from 'zod';

export interface User {
  uid: string;
  id: string;
  email: string | null;
  displayName: string | null;
  role: 'admin' | 'user' | 'User' | 'Admin';
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
}

export interface WorkItem {
  id: string;
  subject: string;
  status: 'Open' | 'In Progress' | 'Pending' | 'Closed';
  urgency: 'High' | 'Medium' | 'Low';
  assignedTo: string; // User UID
  createdBy: string;
  createdAt: string; // ISO date string
  updatedAt: string;
  relatedContact: {
    name: string;
    email: string;
    phone: string;
  };
  overview: string;
  tasks: Task[];
}

export interface Note {
  id: string;
  author: string;
  authorId: string;
  text: string;
  createdAt: string; // ISO date string
  workItemId: string;
}

// Moved from create-user-flow.ts to avoid 'use server' export issues
export const CreateUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string(),
  role: z.enum(['Admin', 'User']),
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

export const CreateUserOutputSchema = z.object({
  uid: z.string().optional(),
  error: z.string().optional(),
});
export type CreateUserOutput = z.infer<typeof CreateUserOutputSchema>;
