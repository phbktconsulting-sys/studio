
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
import { useEffect, useState } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { UpdateUserInputSchema, type UpdateUserInput, type User as UserProfile } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { CustomCalendar } from '@/components/custom-calendar';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { updateUser } from '@/ai/flows/update-user-flow';

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const { toast } = useToast();
  const router = useRouter();
  const { firestore } = useFirebase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
      if (!firestore || !userId) return null;
      return doc(firestore, 'users', userId);
  }, [firestore, userId]);

  const { data: userProfile, isLoading } = useDoc<UserProfile>(userProfileRef);

  const form = useForm<UpdateUserInput>({
    resolver: zodResolver(UpdateUserInputSchema),
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
      dob: new Date(),
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        ...userProfile,
        firstName: userProfile.firstName || '',
        middleName: userProfile.middleName || '',
        lastName: userProfile.lastName || '',
        email: userProfile.email || '',
        mobileNumber: userProfile.mobileNumber || '',
        aadharNumber: userProfile.aadharNumber || '',
        panNumber: userProfile.panNumber || '',
        dob: userProfile.dob ? parseISO(userProfile.dob) : new Date(),
        password: '', // Password should not be pre-filled
      });
    }
  }, [userProfile, form]);

  const onUpdate = async (data: UpdateUserInput) => {
    setIsSubmitting(true);
    if (!userProfileRef) return;
    
    try {
      const payload = {
        uid: userId,
        ...data,
        dob: format(data.dob, 'yyyy-MM-dd'),
      };
      
      const result = await updateUser(payload);

      if(result.success) {
        toast({
            title: 'User Updated',
            description: `User ${data.firstName} ${data.lastName} has been successfully updated.`,
        });
        router.back();
      } else {
        throw new Error(result.error || 'An unknown error occurred.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating user',
        description: error.message || 'Could not update user.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <p>User not found.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-slate-50">
       <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Back</span>
        </Button>
        <div>
          <h1 className="font-headline text-lg font-bold tracking-tight">Edit User Profile</h1>
          <p className="text-xs text-muted-foreground">Modify the details for {userProfile.displayName}.</p>
        </div>
      </div>
      <Card className="shadow-lg">
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onUpdate)} className="space-y-8">
              
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-primary border-b pb-2">Official Details</h2>
                <FormItem className="grid grid-cols-3 gap-4 items-start">
                    <div className="col-span-1 pt-1.5">
                        <FormLabel>Employee ID</FormLabel>
                        <p className="text-xs text-muted-foreground mt-1">This ID is read-only.</p>
                    </div>
                    <div className="col-span-2">
                        <FormControl>
                            <Input readOnly disabled value={userProfile.employeeId} className="bg-muted/50" />
                        </FormControl>
                    </div>
                </FormItem>
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="grid grid-cols-3 gap-4 items-start">
                        <div className="col-span-1 pt-1.5">
                            <FormLabel>Email</FormLabel>
                            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed.</p>
                        </div>
                        <div className="col-span-2">
                            <FormControl>
                                <Input type="email" {...field} readOnly disabled className="bg-muted/50" />
                            </FormControl>
                            <FormMessage />
                        </div>
                      </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem className="grid grid-cols-3 gap-4 items-start">
                        <div className="col-span-1 pt-1.5">
                            <FormLabel>Company</FormLabel>
                        </div>
                        <div className="col-span-2">
                            <FormControl>
                                <Input {...field} disabled className="bg-muted/50" />
                            </FormControl>
                            <FormMessage />
                        </div>
                      </FormItem>
                    )}
                />
              </div>

              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-primary border-b pb-2">Personal Information</h2>
                <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                    <FormItem className="grid grid-cols-3 gap-4 items-start">
                        <div className="col-span-1 pt-1.5"><FormLabel>First Name</FormLabel></div>
                        <div className="col-span-2">
                            <FormControl>
                            <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </div>
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="middleName"
                    render={({ field }) => (
                    <FormItem className="grid grid-cols-3 gap-4 items-start">
                        <div className="col-span-1 pt-1.5"><FormLabel>Middle Name</FormLabel></div>
                        <div className="col-span-2">
                            <FormControl>
                            <Input {...field} placeholder="Optional" />
                            </FormControl>
                            <FormMessage />
                        </div>
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                    <FormItem className="grid grid-cols-3 gap-4 items-start">
                        <div className="col-span-1 pt-1.5"><FormLabel>Last Name</FormLabel></div>
                        <div className="col-span-2">
                            <FormControl>
                            <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </div>
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="dob"
                    render={({ field }) => (
                    <FormItem className="grid grid-cols-3 gap-4 items-start">
                        <div className="col-span-1 pt-1.5"><FormLabel>Date of Birth</FormLabel></div>
                        <div className="col-span-2">
                            <FormControl>
                            <CustomCalendar
                                value={field.value}
                                onChange={field.onChange}
                            />
                            </FormControl>
                            <FormMessage />
                        </div>
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="mobileNumber"
                    render={({ field }) => (
                    <FormItem className="grid grid-cols-3 gap-4 items-start">
                        <div className="col-span-1 pt-1.5"><FormLabel>Mobile Number</FormLabel></div>
                        <div className="col-span-2">
                            <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <span className="text-gray-500 sm:text-sm">+91</span>
                            </div>
                            <FormControl>
                                <Input {...field} className="pl-10" />
                            </FormControl>
                            </div>
                            <FormMessage />
                        </div>
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="aadharNumber"
                    render={({ field }) => (
                    <FormItem className="grid grid-cols-3 gap-4 items-start">
                        <div className="col-span-1 pt-1.5"><FormLabel>Aadhar Number</FormLabel></div>
                        <div className="col-span-2">
                            <FormControl>
                            <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </div>
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="panNumber"
                    render={({ field }) => (
                    <FormItem className="grid grid-cols-3 gap-4 items-start">
                        <div className="col-span-1 pt-1.5"><FormLabel>PAN Number</FormLabel></div>
                        <div className="col-span-2">
                            <FormControl>
                            <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </div>
                    </FormItem>
                    )}
                />
                    <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                    <FormItem className="grid grid-cols-3 gap-4 items-start">
                        <div className="col-span-1 pt-1.5">
                            <FormLabel>New Password</FormLabel>
                            <p className="text-xs text-muted-foreground mt-1">Leave blank to keep the password unchanged.</p>
                        </div>
                        <div className="col-span-2">
                            <div className="relative">
                                <FormControl>
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    {...field}
                                    placeholder="Leave blank to keep unchanged"
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
                        </div>
                    </FormItem>
                    )}
                />
              </div>

              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-primary border-b pb-2">Employment Details</h2>
                <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                    <FormItem className="grid grid-cols-3 gap-4 items-start">
                        <div className="col-span-1 pt-1.5"><FormLabel>Department</FormLabel></div>
                        <div className="col-span-2">
                        <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        >
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select a department" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {[
                            'Operation', 'HR', 'Risk', 'Admin', 'Marketing', 'Other',
                            ].map((dep) => (
                            <SelectItem key={dep} value={dep}>
                                {dep}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </div>
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                    <FormItem className="grid grid-cols-3 gap-4 items-start">
                        <div className="col-span-1 pt-1.5"><FormLabel>Job Title</FormLabel></div>
                        <div className="col-span-2">
                        <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        >
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select a job title" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {[
                            'Associate', 'Senior Associate', 'Team Lead', 'Assistant Manager', 'Manager', 'Senior Manager',
                            ].map((title) => (
                            <SelectItem key={title} value={title}>
                                {title}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </div>
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                    <FormItem className="grid grid-cols-3 gap-4 items-start">
                        <div className="col-span-1 pt-1.5"><FormLabel>Level</FormLabel></div>
                        <div className="col-span-2">
                        <Select
                        onValueChange={field.onChange}
                        value={field.value}
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
                    </div>
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="workLocation"
                render={({ field }) => (
                    <FormItem className="grid grid-cols-3 gap-4 items-start">
                        <div className="col-span-1 pt-1.5"><FormLabel>Work Location</FormLabel></div>
                        <div className="col-span-2">
                        <Select
                        onValueChange={field.onChange}
                        value={field.value}
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
                    </div>
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                    <FormItem className="grid grid-cols-3 gap-4 items-start">
                        <div className="col-span-1 pt-1.5"><FormLabel>Role</FormLabel></div>
                        <div className="col-span-2">
                        <Select
                        onValueChange={field.onChange}
                        value={field.value}
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
                    </div>
                    </FormItem>
                )}
                />
              </div>


              <div className="flex justify-end pt-4 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Updating...' : 'Update User'}
                  </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
