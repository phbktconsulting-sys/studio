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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { UpdateUserInputSchema, type UpdateUserInput, type User as UserProfile } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { CustomCalendar } from '@/components/custom-calendar';
import { Eye, EyeOff } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { updateUser } from '@/ai/flows/update-user-flow';

interface UserProfileDialogProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileDialog({ userId, isOpen, onClose }: UserProfileDialogProps) {
  const { toast } = useToast();
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
    if (!userProfile) return;
    
    try {
      const payload = {
        uid: userProfile.uid,
        ...data,
        dob: format(data.dob, 'yyyy-MM-dd'),
      };
      // Do not send an empty password field
      if (!payload.password) {
        delete payload.password;
      }
      
      const result = await updateUser(payload);

      if (result.success) {
        toast({
          title: 'Profile Updated',
          description: `Your profile has been successfully updated.`,
        });
        onClose();
      } else {
        throw new Error(result.error || 'An unknown error occurred.');
      }
      
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating profile',
        description: error.message || 'Could not update your profile.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit User Profile</DialogTitle>
          <DialogDescription>
            Modify your personal and employment details.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading || !userProfile ? (
            <div className="flex h-96 w-full items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        ) : (
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onUpdate)} className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
              
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
                  <FormItem>
                    <FormLabel className="font-bold">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        value={userProfile.email || ''}
                        readOnly
                        disabled
                        className="bg-muted/50"
                      />
                    </FormControl>
                  </FormItem>
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
                          disabled // Prevent non-admins from changing role
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
               <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Updating...' : 'Update Profile'}
                  </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
