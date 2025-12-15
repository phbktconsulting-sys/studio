'use server';
/**
 * @fileOverview A server-side flow for securely creating Firebase users.
 * This flow uses the Firebase Admin SDK to create a user with email/password
 * and set their custom claims and Firestore profile document.
 *
 * - createUser - The exported function to be called from the client.
 */

import { ai } from '@/ai/genkit';
import type { CreateUserInput, CreateUserOutput } from '@/lib/types';
import { CreateUserInputSchema, CreateUserOutputSchema } from '@/lib/types';

// We need to use the Admin SDK for this, so we'll import it dynamically.
// This ensures it's only imported on the server.
import type { App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

let adminApp: App;

// Initialize the Firebase Admin SDK lazily.
async function initializeAdmin() {
  if (getApps().length) {
    adminApp = getApps()[0]!;
    return adminApp;
  }

  // This requires the GOOGLE_APPLICATION_CREDENTIALS_JSON env var to be set.
  // In Firebase Hosting with Cloud Functions/Run, this is handled automatically.
  // For local development, you need to set this in a .env.local file.
  const serviceAccountString = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!serviceAccountString) {
    throw new Error(
      'The GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set. ' +
      'Please create a service account key and set its JSON content to this variable.'
    );
  }
  
  try {
    const serviceAccount = JSON.parse(serviceAccountString);
    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (e: any) {
    throw new Error(`Failed to parse service account JSON: ${e.message}`);
  }

  return adminApp;
}

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
      } else {
        errorMessage = error.message;
      }
      return { error: errorMessage };
    }
  }
);
