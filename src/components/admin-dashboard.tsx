'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AllWorkItems } from './all-work-items';
import { UserManagement } from './user-management';
import { List, Users, FileText } from 'lucide-react';

type AdminView = 'menu' | 'work-items' | 'users';

export function AdminDashboard() {
  const [view, setView] = useState<AdminView>('menu');

  if (view === 'work-items') {
    return <AllWorkItems onBack={() => setView('menu')} />;
  }

  if (view === 'users') {
    return <UserManagement onBack={() => setView('menu')} />;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Select an administrative task to continue.</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <CardButton
          title="Manage Work Items"
          description="View and manage all work items across the system."
          icon={<List className="h-8 w-8" />}
          onClick={() => setView('work-items')}
        />
        <CardButton
          title="Manage Users"
          description="View, create, and manage user accounts and roles."
          icon={<Users className="h-8 w-8" />}
          onClick={() => setView('users')}
        />
      </div>
    </div>
  );
}

interface CardButtonProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function CardButton({ title, description, icon, onClick }: CardButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-4 rounded-lg border bg-card p-6 text-left shadow-sm transition-all hover:bg-accent hover:text-accent-foreground"
    >
      <div className="rounded-full bg-primary p-3 text-primary-foreground">{icon}</div>
      <div className="flex flex-col">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
