'use server';
/**
 * @fileOverview A server-side flow for securely creating Firebase users.
 * This flow uses the Firebase Admin SDK to create a user with email/password
 * and set their custom claims and Firestore profile document.
 *
 * - createUser - The exported function to be called from the client.
 * - CreateUserInput - The Zod schema for the input.
 * - CreateUserOutput - The Zod schema for the output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit/zod';

// We need to use the Admin SDK for this, so we'll import it dynamically.
// This ensures it's only imported on the server.
import type { App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App;

// Initialize the Firebase Admin SDK lazily.
async function initializeAdmin() {
  if (adminApp) return adminApp;
  const { initializeApp, cert, getApps } = await import('firebase-admin/app');
  if (getApps().length) {
    adminApp = getApps()[0]!;
  } else {
     // This requires the GOOGLE_APPLICATION_CREDENTIALS env var to be set.
     // In Firebase Hosting with Cloud Functions/Run, this is handled automatically.
    adminApp = initializeApp();
  }
  return adminApp;
}

export const CreateUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string(),
  role: z.enum(['Admin', 'User']),
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

export const CreateUserOutputSchema = z.object({
  uid: z.string().optional(),
  error: z.string().optional(),
});
export type CreateUserOutput = z.infer<typeof CreateUserOutputSchema>;

// This is the function we'll call from the client.
export async function createUser(input: CreateUserInput): Promise<CreateUserOutput> {
  return createUserFlow(input);
}

const createUserFlow = ai.defineFlow(
  {
    name: 'createUserFlow',
    inputSchema: CreateUserInputSchema,
    outputSchema: CreateUserOutputSchema,
  },
  async (payload) => {
    try {
      await initializeAdmin();
      const adminAuth = getAuth(adminApp);
      const adminFirestore = getFirestore(adminApp);

      // 1. Create the user in Firebase Authentication
      const userRecord = await adminAuth.createUser({
        email: payload.email,
        password: payload.password,
        displayName: payload.displayName,
      });

      // 2. Set custom claims for the user (for security rules)
      await adminAuth.setCustomUserClaims(userRecord.uid, { role: payload.role });

      // 3. Create the user's profile document in Firestore
      const userProfile = {
        id: userRecord.uid,
        uid: userRecord.uid,
        email: payload.email,
        displayName: payload.displayName,
        role: payload.role,
      };
      await adminFirestore.collection('users').doc(userRecord.uid).set(userProfile);

      return { uid: userRecord.uid };
    } catch (error: any) {
      console.error('Error creating user:', error);
      // Provide a more user-friendly error message
      let errorMessage = 'An unexpected error occurred.';
      if (error.code === 'auth/email-already-exists') {
        errorMessage = 'This email address is already in use by another account.';
      } else if (error.code === 'auth/invalid-password') {
        errorMessage = 'The password is not strong enough. It must be at least 6 characters long.';
      }
      return { error: errorMessage };
    }
  }
);
