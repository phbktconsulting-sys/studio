'use client'
import { users } from '@/lib/data';
import type { User } from '@/lib/types';

// In a real app, this would be a context that watches Firebase Auth state.
// For this example, we'll just return a mock user.
export const useAuth = () => {
  return {
    user: users[0] as User,
  };
};
