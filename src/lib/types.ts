export interface User {
  uid: string;
  id: string;
  email: string | null;
  displayName: string | null;
  role: 'admin' | 'user' | 'User';
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
