import { z } from 'zod';

export interface User {
  uid: string;
  id: string;
  email: string | null;
  displayName: string | null;
  role: 'Admin' | 'User';
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
  createdBy?: string; // User UID
  createdAt?: string; // ISO date string
  completedBy?: string; // User UID
  completedAt?: string; // ISO date string
}

export interface ImageAttachment {
  id: string;
  workItemId: string;
  url: string; // Data URL
  direction: 'Inbound' | 'Outbound';
  fileName: string;
  uploadedAt: string; // ISO date string
  uploadedBy: string; // User UID
  type: string;
  documentSource: string;
  businessEvent: string;
}

export interface WorkItem {
  id: string;
  customId: string;
  process: string;
  subject: string;
  status: 'Open' | 'In Progress' | 'Pending' | 'Closed' | 'Re-indexed';
  urgency: 'High' | 'Medium' | 'Low';
  assignedTo: string; // User UID
  createdBy: string;
  createdAt: string; // ISO date string
  updatedAt: string;
  relatedContact: {
    name: string;
    email: string;
    phone: string;
    phoneSecondary?: string;
    address?: {
      country: string;
      line1: string;
      line2?: string;
      city: string;
      state: string;
      zipcode: string;
    };
    customerUniqueId?: string;
    aadharNumber?: string;
    panNumber?: string;
    businessName?: string;
    businessSize?: string;
    businessRevenue?: string;
    hasOtherProvider?: boolean;
  };
  overview: string;
  tasks: Task[];
  lockInfo?: {
    userId: string;
    userName: string;
    timestamp: string;
  } | null;
}

export interface Note {
  id: string;
  author?: string;
  authorId: string;
  text: string;
  createdAt: string; // ISO date string
  workItemId: string;
  category: string;
  subject: string;
}

export interface GlobalNote {
  id: string;
  customerUniqueId: string;
  authorId: string;
  text: string;
  createdAt: string;
  category: string;
  subject: string;
}


export interface Customer {
  id: string; // This is the customer's email, used as the document ID
  email: string;
  customerUniqueId: string;
  createdAt: string;
  // Denormalized fields for easier access, populated from the latest work item
  name?: string;
  phone?: string;
  address?: string;
}

const AddressSchema = z.object({
  country: z.string().min(1, 'Country is required'),
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipcode: z.string().min(1, 'Zipcode is required'),
});

export const WorkItemCreateSchema = z.object({
  process: z.string().min(1, 'Process is required'),
  urgency: z.enum(['Low', 'Medium', 'High']),
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().email('Invalid email address'),
  customerPhone: z.string().min(1, 'Customer phone is required'),
  customerPhoneSecondary: z.string().optional(),
  customerAddress: AddressSchema.optional(),
  overview: z.string().min(1, 'Overview is required'),
  initialTasks: z.array(z.string()).optional(),
  assignTo: z.enum(['initial_indexing', 'myself']).default('initial_indexing'),
});

export type WorkItemFormValues = z.infer<typeof WorkItemCreateSchema>;

export const ServerWorkItemCreateSchema = z.object({
  process: z.string(),
  urgency: z.enum(['Low', 'Medium', 'High']),
  assignedTo: z.string(),
  createdBy: z.string(),
  relatedContact: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    phoneSecondary: z.string().optional(),
    address: AddressSchema.optional(),
  }),
  overview: z.string(),
  tasks: z.array(z.any()),
  sourceWorkItemId: z.string().optional(),
  reindexReason: z.string().optional(),
  reindexNote: z.string().optional(),
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

export const ContactInfoUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: AddressSchema.optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone is required'),
  aadharNumber: z.string().optional(),
  panNumber: z.string().optional(),
  businessName: z.string().optional(),
  businessSize: z.string().optional(),
  businessRevenue: z.string().optional(),
  hasOtherProvider: z.boolean().optional(),
});
export type ContactInfoUpdateValues = z.infer<typeof ContactInfoUpdateSchema>;

export const DeleteCustomerSchema = z.object({
  id: z.string().min(1, { message: 'Customer ID is required' }),
});
export type DeleteCustomerInput = z.infer<typeof DeleteCustomerSchema>;

// Schema for updating a user profile
export const UpdateUserInputSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1, { message: 'First name is required' }),
  middleName: z.string().optional(),
  lastName: z.string().min(1, { message: 'Last name is required' }),
  password: z.string().optional(),
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
export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;

export const ServerUpdateUserInputSchema = UpdateUserInputSchema.omit({ email: true }).extend({
  uid: z.string(),
  dob: z.string(),
});
export type ServerUpdateUserInput = z.infer<typeof ServerUpdateUserInputSchema>;

export const UpdateUserOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});
export type UpdateUserOutput = z.infer<typeof UpdateUserOutputSchema>;

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
