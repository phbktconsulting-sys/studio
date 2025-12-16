'use server';

import { z } from 'zod';

export interface User {
  uid: string;
  id: string;
  email: string | null;
  displayName: string | null;
  role: 'admin' | 'user' | 'User' | 'Admin';
  employeeId?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dob?: string;
  mobileNumber?: string;
  department?: string;
  jobTitle?: string;
  level?: string;
  workLocation?: string;
  company?: string;
  aadharNumber?: string;
  panNumber?: string;
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

export const CreateUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1, { message: 'First name is required' }),
  middleName: z.string().optional(),
  lastName: z.string().min(1, { message: 'Last name is required' }),
  dob: z.date(),
  mobileNumber: z.string().min(10, { message: 'Mobile number must be at least 10 digits' }),
  department: z.enum(['Operation', 'HR', 'Risk', 'Admin', 'Marketing', 'Other']),
  jobTitle: z.enum(['Associate', 'Senior Associate', 'Team Lead', 'Assistant Manager', 'Manager', 'Senior Manager']),
  level: z.enum(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10']),
  workLocation: z.enum(['Office', 'Remote', 'Hybrid', 'Other']),
  company: z.string().default('PHBKT Group Limited'),
  aadharNumber: z.string().regex(/^\d{12}$/, { message: 'Aadhar must be 12 digits' }),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, { message: 'Invalid PAN format' }),
  role: z.enum(['Admin', 'User']),
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

export const ServerCreateUserInputSchema = CreateUserInputSchema.extend({
    dob: z.string(),
});
export type ServerCreateUserInput = z.infer<typeof ServerCreateUserInputSchema>;


export const CreateUserOutputSchema = z.object({
  uid: z.string().optional(),
  employeeId: z.string().optional(),
  error: z.string().optional(),
});
export type CreateUserOutput = z.infer<typeof CreateUserOutputSchema>;
