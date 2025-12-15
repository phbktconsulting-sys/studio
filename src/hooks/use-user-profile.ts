'use client';

import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User as UserProfile } from '@/lib/types';

/**
 * Hook to fetch the user's profile document from Firestore.
 * This contains custom data like the user's role.
 */
export function useUserProfile() {
  const { firestore, user: authUser, isUserLoading: isAuthLoading } = useFirebase();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser]);

  const { data: userProfile, isLoading: isProfileLoading, error } = useDoc<UserProfile>(userProfileRef);

  return {
    userProfile,
    isLoading: isAuthLoading || isProfileLoading,
    error,
  };
}
