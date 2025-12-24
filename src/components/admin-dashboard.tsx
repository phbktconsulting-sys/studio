
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AllWorkItems } from './all-work-items';
import { UserManagement } from './user-management';
import { AnalyticsDashboard } from './analytics-dashboard';
import { List, Users, BarChart2, Upload, TrendingUp, Contact, FilePlus2 } from 'lucide-react';
import { BatchWorkCreate } from './batch-work-create';
import { SlaTrackingDashboard } from './sla-tracking-dashboard';
import { CustomerWorkflow } from './customer-workflow';
import { NewCreatedWorkItems } from './new-created-work-items';

type AdminView = 'menu' | 'work-items' | 'users' | 'dashboard' | 'batch-create' | 'sla-tracking' | 'customer-workflow' | 'new-created-work-items';

export function AdminDashboard() {
  const [view, setView] = useState<AdminView>('menu');

  if (view === 'work-items') {
    return <AllWorkItems onBack={() => setView('menu')} />;
  }

  if (view === 'users') {
    return <UserManagement onBack={() => setView('menu')} />;
  }

  if (view === 'dashboard') {
    return <AnalyticsDashboard onBack={() => setView('menu')} />;
  }

  if (view === 'batch-create') {
    return <BatchWorkCreate onBack={() => setView('menu')} />;
  }
  
  if (view === 'sla-tracking') {
    return <SlaTrackingDashboard onBack={() => setView('menu')} />;
  }
  
  if (view === 'customer-workflow') {
    return <CustomerWorkflow onBack={() => setView('menu')} />;
  }
  
  if (view === 'new-created-work-items') {
    return <NewCreatedWorkItems onBack={() => setView('menu')} />;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-lg font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-xs text-muted-foreground">Select an administrative task to continue.</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
         <CardButton
          title="Analytics Dashboard"
          description="View charts and graphs for work item progress."
          icon={<BarChart2 className="h-6 w-6" />}
          onClick={() => setView('dashboard')}
        />
        <CardButton
          title="Manage Work Items"
          description="View and manage all work items across the system."
          icon={<List className="h-6 w-6" />}
          onClick={() => setView('work-items')}
        />
        <CardButton
          title="Manage Users"
          description="View, create, and manage user accounts and roles."
          icon={<Users className="h-6 w-6" />}
          onClick={() => setView('users')}
        />
         <CardButton
          title="Batch Work Create"
          description="Create multiple work items by uploading an Excel file."
          icon={<Upload className="h-6 w-6" />}
          onClick={() => setView('batch-create')}
        />
        <CardButton
          title="SLA Tracking"
          description="Track Service Level Agreement compliance for cases."
          icon={<TrendingUp className="h-6 w-6" />}
          onClick={() => setView('sla-tracking')}
        />
         <CardButton
          title="Customer Workflow"
          description="View and manage all customer records in the system."
          icon={<Contact className="h-6 w-6" />}
          onClick={() => setView('customer-workflow')}
        />
         <CardButton
          title="New Work Items"
          description="View work items created today."
          icon={<FilePlus2 className="h-6 w-6" />}
          onClick={() => setView('new-created-work-items')}
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
      className="flex flex-col items-start gap-3 rounded-lg border bg-card p-4 text-left shadow-sm transition-all hover:bg-accent hover:text-accent-foreground"
    >
      <div className="rounded-full bg-primary p-2 text-primary-foreground">{icon}</div>
      <div className="flex flex-col">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
