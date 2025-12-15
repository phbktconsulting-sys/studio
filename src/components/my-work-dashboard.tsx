'use client';

import { getWorkItemsForUser } from '@/lib/data';
import type { WorkItem } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ChevronUp,
} from 'lucide-react';
import { useTabs } from '@/contexts/tab-context';
import { format } from 'date-fns';

const UrgencyIcon = ({ urgency }: { urgency: WorkItem['urgency'] }) => {
  switch (urgency) {
    case 'High':
      return <ChevronUp className="h-5 w-5 text-red-500" />;
    case 'Medium':
      return <ArrowRight className="h-5 w-5 text-yellow-500" />;
    case 'Low':
      return <ArrowDown className="h-5 w-5 text-green-500" />;
    default:
      return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
  }
};

const StatusBadge = ({ status }: { status: WorkItem['status'] }) => {
  const variant =
    status === 'Open'
      ? 'default'
      : status === 'In Progress'
      ? 'secondary'
      : status === 'Closed'
      ? 'outline'
      : 'destructive';
  
  const colorClass = 
    status === 'Open'
    ? 'bg-blue-500 hover:bg-blue-600'
    : status === 'In Progress'
    ? 'bg-yellow-500 hover:bg-yellow-600'
    : status === 'Pending'
    ? 'bg-orange-500 hover:bg-orange-600'
    : 'bg-gray-500 hover:bg-gray-600'

  return <Badge variant="default" className={`border-transparent text-primary-foreground ${colorClass}`}>{status}</Badge>;
};

export function MyWorkDashboard() {
  const { user } = useAuth();
  const { openTab } = useTabs();
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);

  useEffect(() => {
    if (user) {
      const items = getWorkItemsForUser(user.uid);
      setWorkItems(items);
    }
  }, [user]);

  const handleRowClick = (item: WorkItem) => {
    openTab({
      id: item.id,
      title: `WI-${item.id.slice(0, 4)}`,
      type: 'work-item',
    });
  };

  return (
    <div className="p-4 sm:p-6">
      <h1 className="font-headline text-2xl font-bold tracking-tight">My Work</h1>
      <p className="mb-6 text-muted-foreground">Work items assigned to you.</p>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="w-[120px]">ID</TableHead>
              <TableHead className="w-[150px]">Status</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="w-[180px]">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workItems.map((item) => (
              <TableRow key={item.id} onClick={() => handleRowClick(item)} className="cursor-pointer">
                <TableCell className="text-center">
                  <UrgencyIcon urgency={item.urgency} />
                </TableCell>
                <TableCell className="font-medium">{`WI-${item.id.slice(0, 4)}`}</TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
                <TableCell>{item.subject}</TableCell>
                <TableCell>{format(new Date(item.updatedAt), 'MMM d, yyyy')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
