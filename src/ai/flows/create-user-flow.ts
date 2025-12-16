'use server';
/**
 * @fileOverview A server-side flow for securely creating Firebase users.
 * This flow uses the Firebase Admin SDK to create a user with email/password
 * and set their custom claims and Firestore profile document.
 *
 * - createUser - The exported function to be called from the client.
 */

import { ai } from '@/ai/genkit';
import type { CreateUserOutput } from '@/lib/types';
import { CreateUserInputSchema, CreateUserOutputSchema } from '@/lib/types';

// We need to use the Admin SDK for this, so we'll import it dynamically.
// This ensures it's only imported on the server.
import type { App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps, ServiceAccount } from 'firebase-admin/app';

// This is a temporary solution for the prototype. In a real app,
// this should be stored securely (e.g., as a secret in Google Secret Manager).
const serviceAccount: ServiceAccount = {
  "type": "service_account",
  "project_id": "studio-8081664490-573e2",
  "private_key_id": "4ea2e10f8914e7c221f3d150db31b3df9572b173",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCfQVnwWm1pPGuj\nfs19nR9STXzhmROoioD/jXAeypJn88b3/Tdlio9zIksiJp3rwJKqD/yXX9EoZa1e\nD0AVtw6pI9lDbWnweKyO7zZX8MEAY3HMa08LkB+5t2t6UvfcCR+79WHqXd/mJ2Kl\nkGhHq6NSrOSKWd+O9YgKalYt0y7B9/ur4HPTSJ2M1gEklWim8rNWh/Sef1EQkXDO\ndjAT9fRMYn8UUbGgHwmKgFx9c9eDbOTgQQRfDuAe9UY7m6M2ls/VkkSTGgij2+0m\nHMB28HpowPH00TgHDl0ysQsBJ5yXjpEaUQHYHdmVVKNDNCynB42+B558hPquGjN2\neUB/MS6vAgMBAAECggEAFZq3/h3xBHsTNHWEoFXVue8+fHGtHmArv9S1hnfUr2V9\nczGsIjT54On2EgagcIBfZSgQtuMOF3zeWAmZmAM4FJoDD11N0eGNB0GhuFcLgmdQ\njiVrQ8D5jNLlMbhaXO9KmXpgc3rotOsC5uhVko4mSeuf1WT71FkFa472wfYJkdFA\n2r/TIJudVEdxaWcgonP212x9RJHhaAk0Wrhd7w8HZhtXQeYIvurZzzpkOGCJq2Jd\ngw+mhAiBKKBftwkAwhIVQEKUphKtH+YvMIozA3K1QxS6w0r+I0+mZABO4v6C0nsJ\n7n+PlmnSv3zMq9zypL8cP+wpmb1YVxN0ru4IK1cIAQKBgQDX9NZ5G0/Dx4KAP21v\nComf7kznQOc/mlJlvG5oSuw1SvoF7AA9/ypF5G1BtCG7XAmjdlNE1mAV5nCQViTK\nsBBlVKCYRIlgoSdVtMVqTiuGqvLLdY3Rv+el0WrPB5pRRE8q8t97b7b9H40f+Cqc\naDayBasWBk/Atg1FjBRerQ1sbwKBgQC8yPyuEzp78WquomoueFfDEdQt5Ex+XTdQ\nrYlzal+PGPqX82otThQl8zLyoAb0poDyBApX7BH/7/1UUfC1f/5L4D0WezJFzj43\nRLB1P3yGFHATEejn8HLCyuQFNYTVgk0rhewg4UwHpu8+jUGBdDUcP0Kc3r3/LZ0Z\ndekN7roBwQKBgCPU8gkiKPf5EIQrAgNcoj0xEv2D3VrGRkmvHDqdw9eL2zREVj3z\nKpZyMlamhrpJqSfAKEzRrRu1IpQwVuZylCXcBtF8/bZUxuwHlIHw+nPbxXFQzfkx\neEQhHTHAtzAov2IG7mHSxW/2XjohuSA+gmTDYAHFhlIZYtZZSb/zwrhtAoGBAInD\nnekmLQqfjPttmFDbDyhSDWWD8XJRcflU+jYYTS2uy8gxIK15Cej7xZUaxJiqHPT/\nj9DDfAsqRdLPjPnWMmuKcunB81jPfcV1QdP+BVAPAA5ahn0jkYum5akLeikY0lnN\nfBgucP4wiuw5xrDCbbN0UpcJUNsznS4kRnMdX+3BAoGBAJ9ed8wAVfWf0qx/eRfm\nHAHSYteokWTH7tF2Z8MOlPANy1gbwaffqi1VbuIPPdA+Dl2PZnxEkgXcu9OgltzI\nyHIv4TQXNsj/k28tITHawQ67cWQxBJs8WZW2l7ZZYreN4cIpUZ2JNhKnCj4qD3SM\nJaONODDhS9Zf33Bvuymmg04Y\n-----END PRIVATE KEY-----\n".replace(/\\n/g, '\n'),
  "client_email": "firebase-adminsdk-fbsvc@studio-8081664490-573e2.iam.gserviceaccount.com",
  "client_id": "109929678533234167789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40studio-8081664490-573e2.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
} as ServiceAccount;


let adminApp: App;

// Initialize the Firebase Admin SDK lazily.
async function initializeAdmin() {
  if (getApps().length) {
    adminApp = getApps()[0]!;
    return adminApp;
  }
  
  try {
    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (e: any) {
    throw new Error(`Failed to initialize Firebase Admin SDK: ${e.message}`);
  }

  return adminApp;
}

// This is the function we'll call from the client.
export async function createUser(payload: any): Promise<CreateUserOutput> {
  return createUserFlow(payload);
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

      const displayName = `${payload.firstName} ${payload.middleName ? payload.middleName + ' ' : ''}${payload.lastName}`;

      // 1. Create the user in Firebase Authentication
      const userRecord = await adminAuth.createUser({
        email: payload.email,
        password: payload.password,
        displayName: displayName,
      });

      // 2. Set custom claims for the user (for security rules)
      await adminAuth.setCustomUserClaims(userRecord.uid, { role: payload.role });

      // 3. Create the user's profile document in Firestore
      const userProfile = {
        id: userRecord.uid,
        uid: userRecord.uid,
        email: payload.email,
        displayName: displayName,
        firstName: payload.firstName,
        middleName: payload.middleName,
        lastName: payload.lastName,
        dob: payload.dob,
        mobileNumber: payload.mobileNumber,
        department: payload.department,
        jobTitle: payload.jobTitle,
        level: payload.level,
        workLocation: payload.workLocation,
        company: payload.company,
        aadharNumber: payload.aadharNumber,
        panNumber: payload.panNumber,
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
