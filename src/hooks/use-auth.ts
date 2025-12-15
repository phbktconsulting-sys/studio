'use client'
import { useUser } from '@/firebase';

// In a real app, this would be a context that watches Firebase Auth state.
// For this example, we'll just return a mock user.
export const useAuth = () => {
  return useUser();
};
