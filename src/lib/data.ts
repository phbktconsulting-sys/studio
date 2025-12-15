import type { User, WorkItem, Note, Task } from './types';
import { addDays } from 'date-fns';

const now = new Date();

export const users: User[] = [
  {
    uid: 'user-001',
    email: 'ellen.ripley@phbkt.com',
    displayName: 'Ellen Ripley',
    role: 'admin',
  },
];

const workItems: WorkItem[] = [
  {
    id: 'wi-7a1b',
    subject: 'Finalize Q3 Financial Report',
    status: 'In Progress',
    urgency: 'High',
    assignedTo: 'user-001',
    createdBy: 'system',
    createdAt: addDays(now, -10).toISOString(),
    updatedAt: addDays(now, -1).toISOString(),
    relatedContact: {
      name: 'Carter Burke',
      email: 'c.burke@weyland-yutani.com',
      phone: '555-0101',
    },
    overview: 'Compile and verify all departmental financial data for the third quarter. Prepare the final report for board review.',
    tasks: [
        { id: 'task-1', text: 'Collect data from all departments', completed: true },
        { id: 'task-2', text: 'Verify data accuracy', completed: true },
        { id: 'task-3', text: 'Draft preliminary report', completed: false },
        { id: 'task-4', text: 'Submit for review', completed: false },
    ]
  },
  {
    id: 'wi-3c4d',
    subject: 'Onboarding for New Client: Weyland-Yutani',
    status: 'Open',
    urgency: 'High',
    assignedTo: 'user-001',
    createdBy: 'system',
    createdAt: addDays(now, -5).toISOString(),
    updatedAt: addDays(now, -2).toISOString(),
    relatedContact: {
      name: 'Meredith Vickers',
      email: 'm.vickers@weyland-yutani.com',
      phone: '555-0102',
    },
    overview: 'Initiate the onboarding process for our new corporate client, Weyland-Yutani. Set up accounts, schedule kickoff meeting, and assign project manager.',
    tasks: [
        { id: 'task-5', text: 'Create client account in system', completed: true },
        { id: 'task-6', text: 'Schedule kickoff call', completed: false },
        { id: 'task-7', text: 'Assign account manager', completed: false },
    ]
  },
  {
    id: 'wi-9f2e',
    subject: 'Investigate Nostromo Incident',
    status: 'Pending',
    urgency: 'Medium',
    assignedTo: 'user-001',
    createdBy: 'system',
    createdAt: addDays(now, -20).toISOString(),
    updatedAt: addDays(now, -5).toISOString(),
    relatedContact: {
      name: 'Ash',
      email: 'ash.science@weyland-yutani.com',
      phone: '555-0103',
    },
    overview: 'Awaiting further data from the flight recorder. The investigation is currently pending receipt of crucial information.',
    tasks: [
        { id: 'task-8', text: 'Request flight data recorder', completed: true },
        { id: 'task-9', text: 'Analyze data once received', completed: false },
    ]
  },
  {
    id: 'wi-5g8h',
    subject: 'Supply Requisition for LV-426 Outpost',
    status: 'Closed',
    urgency: 'Low',
    assignedTo: 'user-001',
    createdBy: 'system',
    createdAt: addDays(now, -30).toISOString(),
    updatedAt: addDays(now, -15).toISOString(),
    relatedContact: {
      name: 'Corporal Hicks',
      email: 'd.hicks@uscm.gov',
      phone: '555-0104',
    },
    overview: 'All supplies have been ordered and delivered to the LV-426 colonial outpost. This work item is now closed.',
    tasks: [
        { id: 'task-10', text: 'Process requisition form', completed: true },
        { id: 'task-11', text: 'Order supplies', completed: true },
        { id: 'task-12', text: 'Confirm delivery', completed: true },
    ]
  },
];

const notes: { [workItemId: string]: Note[] } = {
  'wi-7a1b': [
    {
      id: 'note-1',
      author: 'Ellen Ripley',
      text: 'Marketing department has submitted their figures. Waiting on R&D.',
      createdAt: addDays(now, -3).toISOString(),
    },
    {
      id: 'note-2',
      author: 'Carter Burke',
      text: 'Just a reminder, the deadline for this is next Friday. The board is very keen to see the results.',
      createdAt: addDays(now, -2).toISOString(),
    },
  ],
  'wi-3c4d': [
    {
      id: 'note-3',
      author: 'System',
      text: 'Work item created. Assigned to Ellen Ripley.',
      createdAt: addDays(now, -5).toISOString(),
    }
  ],
};


// --- Data Fetching Functions ---

/**
 * Simulates fetching all work items assigned to a specific user.
 * @param userId The UID of the user.
 * @returns An array of WorkItem objects.
 */
export const getWorkItemsForUser = (userId: string): WorkItem[] => {
  return workItems.filter(item => item.assignedTo === userId).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

/**
 * Simulates fetching a single work item by its ID.
 * @param workItemId The ID of the work item.
 * @returns A WorkItem object or null if not found.
 */
export const getWorkItemById = (workItemId: string): WorkItem | null => {
  return workItems.find(item => item.id === workItemId) || null;
};

/**
 * Simulates fetching all notes for a specific work item.
 * @param workItemId The ID of the work item.
 * @returns An array of Note objects.
 */
export const getNotesForWorkItem = (workItemId: string): Note[] => {
  return notes[workItemId]?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];
};
