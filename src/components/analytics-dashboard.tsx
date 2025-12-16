'use client';

import { useMemo, useState } from 'react';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import type { WorkItem } from '@/lib/types';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
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

export function AnalyticsDashboard({ onBack }: AnalyticsDashboardProps) {
  const { firestore } = useFirebase();
  const [timeRange, setTimeRange] = useState(30);

  const workItemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const startDate = subDays(new Date(), timeRange);
    return query(
      collection(firestore, 'work_items'),
      where('createdAt', '>=', startDate.toISOString())
    );
  }, [firestore, timeRange]);

  const { data: workItems, isLoading } = useCollection<WorkItem>(workItemsQuery);

  const statusChartData = useMemo(() => {
    if (!workItems) return [];
    const statusCounts: { [key: string]: number } = {
      Open: 0,
      'In Progress': 0,
      Pending: 0,
      Closed: 0,
      'Re-indexed': 0,
    };
    workItems.forEach((item) => {
      if (statusCounts[item.status] !== undefined) {
        statusCounts[item.status]++;
      }
    });
    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));
  }, [workItems]);

  const dailyChartData = useMemo(() => {
    if (!workItems) return [];
    const dailyCounts: { [key: string]: number } = {};
    for (let i = 0; i < timeRange; i++) {
      const date = subDays(new Date(), i);
      const formattedDate = format(date, 'MMM d');
      dailyCounts[formattedDate] = 0;
    }
    workItems.forEach((item) => {
      const formattedDate = format(new Date(item.createdAt), 'MMM d');
      if (dailyCounts[formattedDate] !== undefined) {
        dailyCounts[formattedDate]++;
      }
    });
    return Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .reverse();
  }, [workItems, timeRange]);

  const statusChartConfig = {
    count: { label: 'Work Items', color: 'hsl(var(--primary))' },
  };

  const dailyChartConfig = {
    count: { label: 'Created Items', color: 'hsl(var(--accent))' },
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
        <div className="flex items-center justify-between">
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
            <Select value={String(timeRange)} onValueChange={(val) => setTimeRange(Number(val))}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                </SelectContent>
            </Select>
        </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Work Items by Status</CardTitle>
            <CardDescription className="text-xs">Distribution of all work items in the last {timeRange} days.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={statusChartConfig} className="min-h-[250px] w-full">
              <BarChart accessibilityLayer data={statusChartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="status" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => value.slice(0, 3)} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Created Work Items</CardTitle>
             <CardDescription className="text-xs">Trend of new work items created over the last {timeRange} days.</CardDescription>
          </CardHeader>
          <CardContent>
             <ChartContainer config={dailyChartConfig} className="min-h-[250px] w-full">
              <LineChart accessibilityLayer data={dailyChartData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value} />
                <YAxis />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Line dataKey="count" type="monotone" stroke="var(--color-count)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
