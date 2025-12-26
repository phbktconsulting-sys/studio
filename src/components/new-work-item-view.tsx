'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { useTabs } from '@/contexts/tab-context';
import { WorkItemCreateSchema, type WorkItemFormValues } from '@/lib/types';
import { createWorkItem } from '@/ai/flows/create-work-item-flow';
import { ArrowLeft, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Separator } from './ui/separator';

const employmentTypes = ["Full-time", "Part-time", "On demand", "Negotiable"];
const workingScheduleBadges = ["Monday to Friday", "Weekend availability", "Day shift"];

export function NewWorkItemView() {
  const { user } = useFirebase();
  const { openTab, closeTab } = useTabs();
  const { toast } = useToast();

  const form = useForm<WorkItemFormValues>({
    resolver: zodResolver(WorkItemCreateSchema),
    defaultValues: {
      employmentType: [],
      workingSchedule: '',
      workingScheduleBadges: [],
      salaryType: 'hourly',
      hourlyRate: 35,
      salaryIsNegotiable: false,
      hiringMultipleCandidates: false,
    },
  });

  const onSubmit = async (data: WorkItemFormValues) => {
    toast({
      title: 'Form Submitted',
      description: <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4"><code className="text-white">{JSON.stringify(data, null, 2)}</code></pre>,
    })
  };

  const handleCancel = () => {
    closeTab('new-work-item');
  };

  const toggleBadge = (badge: string) => {
    const currentBadges = form.getValues('workingScheduleBadges') || [];
    const newBadges = currentBadges.includes(badge)
      ? currentBadges.filter(b => b !== badge)
      : [...currentBadges, badge];
    form.setValue('workingScheduleBadges', newBadges);
  }

  const salaryType = form.watch('salaryType');

  return (
    <div className="p-4 sm:p-6 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
          <div>
            <h1 className="font-headline text-xl font-bold tracking-tight">Create New Work Item</h1>
            <p className="text-sm text-muted-foreground">Fill out the details below to create a new work item.</p>
          </div>
        </div>
        <Card className="shadow-none">
          <CardContent className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                
                {/* Employment Type */}
                <FormField
                  control={form.control}
                  name="employmentType"
                  render={() => (
                    <FormItem className="space-y-4">
                      <div>
                        <FormLabel className="text-base font-semibold">Employment type</FormLabel>
                        <p className="text-sm text-muted-foreground">Pick one or multiple options</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {employmentTypes.map((item) => (
                          <FormField
                            key={item}
                            control={form.control}
                            name="employmentType"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={item}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, item])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== item
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal text-sm">
                                    {item}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Working Schedule */}
                <div className="space-y-4">
                   <div>
                      <Label className="text-base font-semibold">Working schedule</Label>
                      <p className="text-sm text-muted-foreground">You can pick multiple work schedules.</p>
                    </div>
                  <FormField
                    control={form.control}
                    name="workingSchedule"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white">
                               <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                              <SelectValue placeholder="Pick working schedule" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="flexible">Flexible schedule</SelectItem>
                            <SelectItem value="fixed">Fixed schedule</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2 pt-2">
                    {workingScheduleBadges.map(badge => (
                      <Button
                        key={badge}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggleBadge(badge)}
                        className={cn(
                          "rounded-full bg-white",
                          form.getValues('workingScheduleBadges')?.includes(badge) && "bg-primary/10 border-primary text-primary"
                        )}
                      >
                        {badge}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Salary */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Salary</Label>
                    <p className="text-sm text-muted-foreground">Choose how you prefer to pay for this job.</p>
                  </div>
                  <FormField
                    control={form.control}
                    name="salaryType"
                    render={({ field }) => (
                      <FormItem>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-2 gap-4"
                        >
                          <FormItem>
                            <RadioGroupItem value="hourly" id="hourly" className="peer sr-only" />
                            <Label
                              htmlFor="hourly"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                              <Clock className="mb-3 h-6 w-6" />
                              Hourly
                            </Label>
                          </FormItem>
                          <FormItem>
                            <RadioGroupItem
                              value="custom"
                              id="custom"
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor="custom"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                               <svg viewBox="0 0 24 24" fill="none" className="mb-3 h-6 w-6">
                                <path d="M12.5 6.25a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" fill="currentColor"></path>
                               </svg>
                              Custom
                            </Label>
                          </FormItem>
                        </RadioGroup>
                      </FormItem>
                    )}
                  />
                  {salaryType === 'hourly' && (
                    <div className="space-y-4 pt-4">
                      <FormField
                        control={form.control}
                        name="hourlyRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hourly rate</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                                <Input type="number" className="pl-6 bg-white" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="salaryIsNegotiable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="font-normal">
                                Salary is negotiable
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                <Separator />
                
                {/* Hiring Multiple Candidates */}
                 <FormField
                  control={form.control}
                  name="hiringMultipleCandidates"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-semibold">Hiring multiple candidates?</FormLabel>
                        <p className="text-sm text-muted-foreground">This will be displayed on job page for candidates to see.</p>
                      </div>
                       <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />


                <div className="flex justify-end gap-2 pt-8">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Work Item</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
