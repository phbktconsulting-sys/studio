
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
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
import { useEffect, useState } from 'react';
import { createUser } from '@/ai/flows/create-user-flow';
import { getNextEmployeeId } from '@/ai/flows/get-next-employee-id-flow';
import { CreateUserInputSchema, type CreateUserInput } from '@/lib/types';
import { format } from 'date-fns';
import { CustomCalendar } from '@/components/custom-calendar';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function NewUserPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextEmployeeId, setNextEmployeeId] = useState<string>('Loading...');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    async function fetchNextId() {
      try {
        const id = await getNextEmployeeId();
        setNextEmployeeId(id);
      } catch (error) {
        console.error('Failed to fetch next employee ID:', error);
        setNextEmployeeId('Error');
      }
    }
    fetchNextId();
  }, []);

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(CreateUserInputSchema),
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      password: '',
      mobileNumber: '',
      department: 'Operation',
      jobTitle: 'Associate',
      level: 'L1',
      workLocation: 'Office',
      company: 'PHBKT Group Limited',
      aadharNumber: '',
      panNumber: '',
      role: 'User',
    },
  });

  const { control, setValue } = form;
  const firstName = useWatch({ control, name: 'firstName' });
  const lastName = useWatch({ control, name: 'lastName' });

  useEffect(() => {
    if (firstName && lastName) {
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@phbkt.com`.replace(
        /\s+/g,
        ''
      );
      setValue('email', email);
    } else {
      setValue('email', '');
    }
  }, [firstName, lastName, setValue]);

  const onSubmit = async (data: CreateUserInput) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        dob: format(data.dob, 'yyyy-MM-dd'),
      };
      const result = await createUser(payload);

      if (result.uid) {
        toast({
          title: 'User Created',
          description: `User ${data.firstName} ${data.lastName} (ID: ${result.employeeId}) has been successfully created.`,
        });
        router.back();
      } else {
        throw new Error(result.error || 'An unknown error occurred.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error creating user',
        description: error.message || 'Could not create user.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
       <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div>
          <h1 className="font-headline text-lg font-bold tracking-tight">Create New User</h1>
          <p className="text-xs text-muted-foreground">Fill out the details below to create a new user account.</p>
        </div>
      </div>
      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Official Details Section */}
              <div className="space-y-4">
                 <h2 className="text-base font-semibold text-primary">Official Details</h2>
                 <Separator />
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-3">
                  <FormItem>
                    <FormLabel className="font-bold text-xs">Employee ID</FormLabel>
                    <FormControl>
                      <Input readOnly disabled value={nextEmployeeId} className="bg-muted/50" />
                    </FormControl>
                  </FormItem>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs">Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            {...field}
                            readOnly
                            disabled
                            className="bg-muted/50"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs">Company</FormLabel>
                        <FormControl>
                          <Input {...field} disabled className="bg-muted/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>


              {/* Personal Information Section */}
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-primary">Personal Information</h2>
                <Separator />
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs">First Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="middleName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs">Middle Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Optional" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs">Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="dob"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs">Date of Birth</FormLabel>
                        <FormControl>
                          <CustomCalendar
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-4">
                  <FormField
                    control={form.control}
                    name="mobileNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs">Mobile Number</FormLabel>
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <span className="text-gray-500 sm:text-sm">+91</span>
                          </div>
                          <FormControl>
                            <Input {...field} className="pl-10" />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="aadharNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs">Aadhar Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="panNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs">PAN Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs">Password</FormLabel>
                          <div className="relative">
                              <FormControl>
                              <Input
                                  type={showPassword ? 'text' : 'password'}
                                  {...field}
                              />
                              </FormControl>
                              <Button
                              variant="ghost"
                              type="button"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                              onClick={() => setShowPassword(!showPassword)}
                              >
                              {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                              ) : (
                                  <Eye className="h-4 w-4" />
                              )}
                              </Button>
                          </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Employment Details Section */}
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-primary">Employment Details</h2>
                <Separator />
                  <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-5">
                   <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs">Department</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[
                              'Operation',
                              'HR',
                              'Risk',
                              'Admin',
                              'Marketing',
                              'Other',
                            ].map((dep) => (
                              <SelectItem key={dep} value={dep}>
                                {dep}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs">Job Title</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a job title" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[
                              'Associate',
                              'Senior Associate',
                              'Team Lead',
                              'Assistant Manager',
                              'Manager',
                              'Senior Manager',
                            ].map((title) => (
                              <SelectItem key={title} value={title}>
                                {title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs">Level</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.from(
                              { length: 10 },
                              (_, i) => `L${i + 1}`
                            ).map((level) => (
                              <SelectItem key={level} value={level}>
                                {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="workLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs">Work Location</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {['Office', 'Remote', 'Hybrid', 'Other'].map(
                              (loc) => (
                                <SelectItem key={loc} value={loc}>
                                  {loc}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs">Role</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="User">User</SelectItem>
                            <SelectItem value="Admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>


              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

    