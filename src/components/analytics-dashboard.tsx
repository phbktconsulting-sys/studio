
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { subDays, format, startOfDay, endOfDay, differenceInDays, addDays } from 'date-fns';
import { Button } from './ui/button';
import { ArrowLeft, Calendar as CalendarIcon, X } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';


interface AnalyticsDashboardProps {
  onBack: () => void;
}

const processTypes = [
  "New Business Request",
  "Development Services (Web & App)",
  "Operations & Support (Backend)",
  "Digital Service Request",
  "Feedback / Complaint",
  "Other Service Request"
];

const statusTypes: WorkItem['status'][] = ['Open', 'In Progress', 'Pending', 'Closed', 'Re-indexed'];

export function AnalyticsDashboard({ onBack }: AnalyticsDashboardProps) {
  const { firestore } = useFirebase();
  const [dateRange, setDateRange] = useState([
    {
      startDate: subDays(new Date(), 30),
      endDate: new Date(),
      key: 'selection'
    }
  ]);
  const [processFilter, setProcessFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');

  // --- Data Fetching ---
  const workItemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'work_items')
    );
  }, [firestore]);
  
  const usersQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: workItems, isLoading: workItemsLoading } = useCollection<WorkItem>(workItemsQuery);
  const { data: users, isLoading: usersLoading } = useCollection<User>(usersQuery);

  const isLoading = workItemsLoading || usersLoading;

  const dateFilteredWorkItems = useMemo(() => {
    if (!workItems) return [];
    const startDate = startOfDay(dateRange[0].startDate);
    const endDate = endOfDay(dateRange[0].endDate);
    return workItems.filter(item => {
        const createdAt = new Date(item.createdAt);
        return createdAt >= startDate && createdAt <= endDate;
    });
  }, [workItems, dateRange]);


  // Apply process and user filters
  const filteredWorkItems = useMemo(() => {
    if (!dateFilteredWorkItems) return [];
    return dateFilteredWorkItems.filter(item => {
      const processMatch = processFilter === 'all' || item.process === processFilter;
      const userMatch = userFilter === 'all' || item.assignedTo === userFilter;
      return processMatch && userMatch;
    });
  }, [dateFilteredWorkItems, processFilter, userFilter]);

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
    const dayDifference = Math.max(differenceInDays(dateRange[0].endDate, dateRange[0].startDate), 1);

    for (let i = 0; i <= dayDifference; i++) {
      const date = addDays(dateRange[0].startDate, i);
      dailyCounts[format(date, 'MMM d')] = 0;
    }

    filteredWorkItems.forEach((item) => {
      const formattedDate = format(new Date(item.createdAt), 'MMM d');
      if (dailyCounts[formattedDate] !== undefined) {
        dailyCounts[formattedDate]++;
      }
    });
    return Object.entries(dailyCounts).map(([date, count]) => ({ date, count }));
  }, [filteredWorkItems, dateRange]);

  
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

  const pivotTableData = useMemo(() => {
    if (!dateFilteredWorkItems || !users) return [];
    
    const userStats: { [key: string]: { [key: string]: number | string } } = {};

    users.forEach(user => {
      userStats[user.uid] = {
        userName: user.displayName || 'Unknown',
        'Open': 0,
        'In Progress': 0,
        'Pending': 0,
        'Closed': 0,
        'Re-indexed': 0,
        'Total': 0,
      };
    });

    dateFilteredWorkItems.forEach(item => {
      if (userStats[item.assignedTo]) {
        userStats[item.assignedTo][item.status] = (userStats[item.assignedTo][item.status] as number) + 1;
        userStats[item.assignedTo]['Total'] = (userStats[item.assignedTo]['Total'] as number) + 1;
      }
    });

    return Object.values(userStats).sort((a,b) => (b.Total as number) - (a.Total as number));
  }, [dateFilteredWorkItems, users]);
  
  const maxTotal = useMemo(() => Math.max(...pivotTableData.map(d => d.Total as number)), [pivotTableData]);


  const chartConfig = {
    count: { label: 'Work Items' },
    items: { label: 'Created Items' },
  };
  
  const clearFilters = () => {
    setUserFilter('all');
    setProcessFilter('all');
    setDateRange([
      {
        startDate: subDays(new Date(), 30),
        endDate: new Date(),
        key: 'selection'
      }
    ]);
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
       <div className="flex flex-wrap items-start justify-between gap-4">
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
        <div className="flex flex-col items-end gap-2">
            <div className="grid grid-cols-3 gap-2">
                <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-full h-8 text-xs">
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
                <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Filter by Process" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all" className="text-xs">All Processes</SelectItem>
                    {processTypes.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                </SelectContent>
                </Select>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-8 text-xs",
                        !dateRange[0].startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange[0].startDate && dateRange[0].endDate ? (
                        <>
                          {format(dateRange[0].startDate, "LLL dd, y")} -{" "}
                          {format(dateRange[0].endDate, "LLL dd, y")}
                        </>
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                     <DateRange
                        editableDateInputs={true}
                        onChange={item => setDateRange([item.selection])}
                        moveRangeOnFirstSelection={false}
                        ranges={dateRange}
                        className="w-full"
                    />
                  </PopoverContent>
                </Popover>
            </div>
             <Button variant="ghost" className="h-8" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Clear
              </Button>
        </div>
      </div>
      
      <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle className="text-base">User Workload Pivot</CardTitle>
                <CardDescription className="text-xs">
                    Summary of work items by status for each user in the selected time range.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-xs">User</TableHead>
                            {statusTypes.map(status => (
                                <TableHead key={status} className="text-center text-xs">{status}</TableHead>
                            ))}
                            <TableHead className="text-center text-xs font-bold">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pivotTableData.map((data, index) => (
                           <TableRow key={index} className={cn(data.Total === maxTotal && maxTotal > 0 && 'bg-primary/5')}>
                                <TableCell className="font-medium text-xs py-2">{data.userName}</TableCell>
                                <TableCell className="text-center text-xs py-2">
                                  <Badge variant="outline" className="border-blue-500 text-blue-500">{data['Open']}</Badge>
                                </TableCell>
                                <TableCell className="text-center text-xs py-2">
                                  <Badge variant="outline" className="border-yellow-500 text-yellow-500">{data['In Progress']}</Badge>
                                </TableCell>
                                <TableCell className="text-center text-xs py-2">
                                  <Badge variant="outline" className="border-orange-500 text-orange-500">{data['Pending']}</Badge>
                                </TableCell>
                                <TableCell className="text-center text-xs py-2">
                                  <Badge variant="outline" className="border-green-600 text-green-600">{data['Closed']}</Badge>
                                </TableCell>
                                <TableCell className="text-center text-xs py-2">
                                  <Badge variant="outline" className="border-purple-500 text-purple-500">{data['Re-indexed']}</Badge>
                                </TableCell>
                                <TableCell className="text-center text-xs font-bold py-2">
                                   <Badge variant="secondary">{data['Total']}</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
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
    </div>
  );
}
