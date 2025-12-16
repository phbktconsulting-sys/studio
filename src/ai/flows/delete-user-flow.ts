'use server';
/**
 * @fileOverview A server-side flow for securely deleting a Firebase user.
 * This flow uses the Firebase Admin SDK to delete a user from Authentication
 * and their corresponding profile from Firestore.
 *
 * - deleteUser - The exported function to be called from the client.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
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

const DeleteUserInputSchema = z.object({
  uid: z.string().min(1, { message: 'User ID is required' }),
});
export type DeleteUserInput = z.infer<typeof DeleteUserInputSchema>;

const DeleteUserOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});
export type DeleteUserOutput = z.infer<typeof DeleteUserOutputSchema>;


// This is the function we'll call from the client.
export async function deleteUser(payload: DeleteUserInput): Promise<DeleteUserOutput> {
  return deleteUserFlow(payload);
}

const deleteUserFlow = ai.defineFlow(
  {
    name: 'deleteUserFlow',
    inputSchema: DeleteUserInputSchema,
    outputSchema: DeleteUserOutputSchema,
  },
  async (payload) => {
    await initializeAdmin();
    const adminAuth = getAuth(adminApp);
    const adminFirestore = getFirestore(adminApp);

    try {
      // 1. Delete user from Firestore
      await adminFirestore.collection('users').doc(payload.uid).delete();

      // 2. Delete user from Firebase Authentication
      await adminAuth.deleteUser(payload.uid);

      return { success: true };

    } catch (error: any) {
      console.error('Error deleting user:', error);
      let errorMessage = 'An unexpected error occurred while deleting the user.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'User not found in Firebase Authentication. The profile may have been partially deleted.';
      } else {
        errorMessage = error.message;
      }
      return { success: false, error: errorMessage };
    }
  }
);
