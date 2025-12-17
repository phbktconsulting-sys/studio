
'use client';

import { useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { WorkItem, User } from '@/lib/types';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import * as RechartsPrimitive from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { subDays, format } from 'date-fns';
import { Button } from './ui/button';
import { ArrowLeft } from 'lucide-react';

interface AnalyticsDashboardProps {
  onBack: () => void;
}

const processTypes = [
  'Request Information',
  'Request Quotation',
  'Request Application',
  'Request Website',
  'Request inquiry',
  'Request Backend Support',
  'Request Other',
];

export function AnalyticsDashboard({ onBack }: AnalyticsDashboardProps) {
  const { firestore } = useFirebase();
  const [timeRange, setTimeRange] = useState(30);
  const [processFilter, setProcessFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');


  // --- Data Fetching ---
  const dateFilter = useMemo(() => subDays(new Date(), timeRange), [timeRange]);

  const workItemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'work_items'),
      where('createdAt', '>=', dateFilter.toISOString())
    );
  }, [firestore, dateFilter]);
  
  const usersQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: workItems, isLoading: workItemsLoading } = useCollection<WorkItem>(workItemsQuery);
  const { data: users, isLoading: usersLoading } = useCollection<User>(usersQuery);

  const isLoading = workItemsLoading || usersLoading;

  // Apply process and user filters
  const filteredWorkItems = useMemo(() => {
    if (!workItems) return [];
    return workItems.filter(item => {
      const processMatch = processFilter === 'all' || item.process === processFilter;
      const userMatch = userFilter === 'all' || item.assignedTo === userFilter;
      return processMatch && userMatch;
    });
  }, [workItems, processFilter, userFilter]);

  // --- Data Processing for Charts ---
  const usersMap = useMemo(() => {
    if (!users) return new Map<string, string>();
    return new Map(users.map(u => [u.uid, u.displayName || u.email || 'Unknown User']));
  }, [users]);
  
  const statusChartData = useMemo(() => {
    if (!filteredWorkItems) return [];
    const counts: { [key: string]: number } = {};
    filteredWorkItems.forEach((item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [filteredWorkItems]);

  const dailyChartData = useMemo(() => {
    if (!filteredWorkItems) return [];
    const dailyCounts: { [key: string]: number } = {};
    for (let i = 0; i < timeRange; i++) {
      const date = subDays(new Date(), i);
      dailyCounts[format(date, 'MMM d')] = 0;
    }
    filteredWorkItems.forEach((item) => {
      const formattedDate = format(new Date(item.createdAt), 'MMM d');
      if (dailyCounts[formattedDate] !== undefined) {
        dailyCounts[formattedDate]++;
      }
    });
    return Object.entries(dailyCounts).map(([date, count]) => ({ date, count })).reverse();
  }, [filteredWorkItems, timeRange]);
  
  const assigneeChartData = useMemo(() => {
    if (!filteredWorkItems || !usersMap.size) return [];
    const counts: { [key: string]: number } = {};
    filteredWorkItems.forEach((item) => {
      const assigneeName = usersMap.get(item.assignedTo) || 'Unassigned';
      counts[assigneeName] = (counts[assigneeName] || 0) + 1;
    });
    return Object.entries(counts).map(([assignee, count]) => ({ assignee, count }));
  }, [filteredWorkItems, usersMap]);

  const processChartData = useMemo(() => {
    if (!filteredWorkItems) return [];
    const counts: { [key: string]: number } = {};
    filteredWorkItems.forEach((item) => {
        counts[item.process] = (counts[item.process] || 0) + 1;
    });
    return Object.entries(counts).map(([process, count]) => ({ process, count }));
  }, [filteredWorkItems]);


  const chartConfig = {
    count: { label: 'Work Items' },
    items: { label: 'Created Items' },
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <div>
            <h1 className="font-headline text-lg font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-xs text-muted-foreground">Overview of work item activity.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs">
                <SelectValue placeholder="Filter by User" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all" className="text-xs">All Users</SelectItem>
                {users?.map(user => (
                    <SelectItem key={user.uid} value={user.uid} className="text-xs">{user.displayName}</SelectItem>
                ))}
            </SelectContent>
            </Select>

            <Select value={processFilter} onValueChange={setProcessFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs">
                <SelectValue placeholder="Filter by Process" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all" className="text-xs">All Processes</SelectItem>
                {processTypes.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
            </SelectContent>
            </Select>
            
            <Select value={String(timeRange)} onValueChange={(val) => setTimeRange(Number(val))}>
            <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs">
                <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="7" className="text-xs">Last 7 Days</SelectItem>
                <SelectItem value="30" className="text-xs">Last 30 Days</SelectItem>
                <SelectItem value="90" className="text-xs">Last 90 Days</SelectItem>
                <SelectItem value="365" className="text-xs">Last 365 Days</SelectItem>
            </SelectContent>
            </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Work Items by Assignee</CardTitle>
            <CardDescription className="text-xs">Work items assigned to each user.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
              <BarChart accessibilityLayer data={assigneeChartData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid horizontal={false} />
                <YAxis dataKey="assignee" type="category" tickLine={false} tickMargin={10} axisLine={false} className="text-xs" />
                <XAxis dataKey="count" type="number" hide />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={4}>
                   {assigneeChartData.map((entry) => (
                    <RechartsPrimitive.LabelList
                      key={entry.assignee}
                      dataKey="count"
                      position="right"
                      offset={8}
                      className="fill-foreground text-xs"
                      formatter={(value: number) => value.toLocaleString()}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Created Work Items</CardTitle>
            <CardDescription className="text-xs">Trend of new work items created.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ count: { label: 'Created Items', color: 'hsl(var(--accent))'}}} className="min-h-[250px] w-full">
              <LineChart accessibilityLayer data={dailyChartData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
                <YAxis dataKey="count" />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Line dataKey="count" type="monotone" stroke="var(--color-count)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Work Items by Status</CardTitle>
            <CardDescription className="text-xs">Distribution of work items by status.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{count: {color: 'hsl(var(--chart-2))'}}} className="min-h-[250px] w-full">
              <BarChart accessibilityLayer data={statusChartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="status" tickLine={false} tickMargin={10} axisLine={false} className="text-xs" />
                <YAxis dataKey="count" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Work Items by Process</CardTitle>
            <CardDescription className="text-xs">Distribution of work items by process.</CardDescription>
          </CardHeader>
          <CardContent>
             <ChartContainer config={{count: {color: 'hsl(var(--chart-4))'}}} className="min-h-[250px] w-full">
              <BarChart accessibilityLayer data={processChartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="process" tickLine={false} axisLine={false} tickMargin={10} angle={-45} textAnchor="end" height={80} className="text-xs" />
                <YAxis dataKey="count" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
