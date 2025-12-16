
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
  customId: string;
  process: string;
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
  dob: z.date({
    required_error: "A date of birth is required.",
  }),
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


export const WorkItemCreateSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters.'),
  process: z.enum(['Request Information', 'Request Quotation', 'Request Application', 'Request Website', 'Request inquiry', 'Request Backend Support', 'Request Other']),
  customerName: z.string().min(2, 'Customer name is required.'),
  customerEmail: z.string().email('Invalid email address.'),
  customerPhone: z.string().optional(),
  urgency: z.enum(['Low', 'Medium', 'High']),
  overview: z.string().min(10, 'Overview must be at least 10 characters.'),
});
export type WorkItemFormValues = z.infer<typeof WorkItemCreateSchema>;

export const ServerWorkItemCreateSchema = z.object({
  subject: z.string(),
  process: z.string(),
  urgency: z.enum(['Low', 'Medium', 'High']),
  assignedTo: z.string(),
  createdBy: z.string(),
  relatedContact: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
  }),
  overview: z.string(),
  tasks: z.array(z.any()),
});

export const WorkItemCreateResponseSchema = z.object({
  id: z.string().optional(),
  customId: z.string().optional(),
  error: z.string().optional(),
});
export type WorkItemCreateResponse = z.infer<typeof WorkItemCreateResponseSchema>;

export const DeleteWorkItemInputSchema = z.object({
  id: z.string().min(1, { message: 'Work Item ID is required' }),
});
export type DeleteWorkItemInput = z.infer<typeof DeleteWorkItemInputSchema>;

export const DeleteWorkItemOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});
export type DeleteWorkItemOutput = z.infer<typeof DeleteWorkItemOutputSchema>;
