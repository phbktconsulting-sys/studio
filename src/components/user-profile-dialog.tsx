'use client';

import { Button } from '@/components/ui/button';
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
import { type User as UserProfile } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';

interface UserProfileDialogProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="grid grid-cols-2 gap-4">
    <p className="font-semibold text-gray-600">{label}:</p>
    <p className="text-gray-800">{value || 'N/A'}</p>
  </div>
);

export function UserProfileDialog({ userId, isOpen, onClose }: UserProfileDialogProps) {
  const { firestore } = useFirebase();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return doc(firestore, 'users', userId);
  }, [firestore, userId]);

  const { data: userProfile, isLoading } = useDoc<UserProfile>(userProfileRef);

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
          <DialogDescription>
            Your personal and employment details.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading || !userProfile ? (
            <div className="flex h-96 w-full items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        ) : (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4 py-4 text-sm">
              {/* Official Details Section */}
              <div className="space-y-3">
                 <h2 className="text-base font-semibold text-primary">Official Details</h2>
                 <Separator />
                <InfoRow label="Employee ID" value={userProfile.employeeId} />
                <InfoRow label="Email" value={userProfile.email} />
                <InfoRow label="Company" value={userProfile.company} />
              </div>

              {/* Personal Information Section */}
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-primary">Personal Information</h2>
                <Separator />
                <InfoRow label="Full Name" value={userProfile.displayName} />
                <InfoRow label="Date of Birth" value={userProfile.dob ? format(parseISO(userProfile.dob), 'MMMM d, yyyy') : 'N/A'} />
                <InfoRow label="Mobile Number" value={userProfile.mobileNumber} />
                <InfoRow label="Aadhar Number" value={userProfile.aadharNumber} />
                <InfoRow label="PAN Number" value={userProfile.panNumber} />
              </div>

              {/* Employment Details Section */}
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-primary">Employment Details</h2>
                <Separator />
                <InfoRow label="Department" value={userProfile.department} />
                <InfoRow label="Job Title" value={userProfile.jobTitle} />
                <InfoRow label="Level" value={userProfile.level} />
                <InfoRow label="Work Location" value={userProfile.workLocation} />
                <InfoRow label="Role" value={userProfile.role} />
              </div>
               <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                  >
                    Close
                  </Button>
              </DialogFooter>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
