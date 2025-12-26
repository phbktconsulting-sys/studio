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
import { Separator } from '@/components/ui/separator';
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
    <div className="p-4 sm:p-6">
       <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div>
          <h1 className="font-headline text-xl font-bold tracking-tight">Edit User Profile</h1>
          <p className="text-sm text-muted-foreground">Modify the details for {userProfile.displayName}.</p>
        </div>
      </div>
      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onUpdate)} className="space-y-8">
              
              {/* Official Details Section */}
              <div className="space-y-4">
                 <h2 className="text-lg font-semibold text-primary">Official Details</h2>
                 <Separator />
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-3">
                  <FormItem>
                    <FormLabel className="font-bold">Employee ID</FormLabel>
                    <FormControl>
                      <Input readOnly disabled value={userProfile.employeeId} className="bg-muted/50" />
                    </FormControl>
                  </FormItem>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">Email</FormLabel>
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
                        <FormLabel className="font-bold">Company</FormLabel>
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
                <h2 className="text-lg font-semibold text-primary">Personal Information</h2>
                <Separator />
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">First Name</FormLabel>
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
                        <FormLabel className="font-bold">Middle Name</FormLabel>
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
                        <FormLabel className="font-bold">Last Name</FormLabel>
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
                        <FormLabel className="font-bold">Date of Birth</FormLabel>
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
                        <FormLabel className="font-bold">Mobile Number</FormLabel>
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
                        <FormLabel className="font-bold">Aadhar Number</FormLabel>
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
                        <FormLabel className="font-bold">PAN Number</FormLabel>
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
                        <FormLabel className="font-bold">New Password</FormLabel>
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
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Employment Details Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-primary">Employment Details</h2>
                <Separator />
                  <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-5">
                   <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">Department</FormLabel>
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
                        <FormLabel className="font-bold">Job Title</FormLabel>
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
                        <FormLabel className="font-bold">Level</FormLabel>
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
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="workLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">Work Location</FormLabel>
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
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">Role</FormLabel>
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
                      </FormItem>
                    )}
                  />
                </div>
              </div>


              <div className="flex justify-end pt-4">
                <div className="flex space-x-2">
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
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
