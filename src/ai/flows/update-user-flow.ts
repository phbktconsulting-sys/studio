'use server';
/**
 * @fileOverview A server-side flow for securely updating a Firebase user's profile.
 * This flow uses the Firebase Admin SDK to update a user's details in both
 * Firebase Authentication (displayName, password if provided) and their
 * Firestore profile document.
 *
 * - updateUser - The exported function to be called from the client.
 */

import { ai } from '@/ai/genkit';
import { ServerUpdateUserInputSchema, UpdateUserOutputSchema, type UpdateUserOutput } from '@/lib/types';
import type { App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps, ServiceAccount } from 'firebase-admin/app';

const serviceAccount: ServiceAccount = {
  "type": "service_account",
  "project_id": "studio-8081664490-573e2",
  "private_key_id": "4ea2e10f8914e7c221f3d150db31b3df9572b173",
  "private_key": "-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCfQVnwWm1pPGuj\\nfs19nR9STXzhmROoioD/jXAeypJn88b3/Tdlio9zIksiJp3rwJKqD/yXX9EoZa1e\\nD0AVtw6pI9lDbWnweKyO7zZX8MEAY3HMa08LkB+5t2t6UvfcCR+79WHqXd/mJ2Kl\\nkGhHq6NSrOSKWd+O9YgKalYt0y7B9/ur4HPTSJ2M1gEklWim8rNWh/Sef1EQkXDO\\ndjAT9fRMYn8UUbGgHwmKgFx9c9eDbOTgQQRfDuAe9UY7m6M2ls/VkkSTGgij2+0m\\nHMB28HpowPH00TgHDl0ysQsBJ5yXjpEaUQHYHdmVVKNDNCynB42+B558hPquGjN2\\neUB/MS6vAgMBAAECggEAFZq3/h3xBHsTNHWEoFXVue8+fHGtHmArv9S1hnfUr2V9\\nczGsIjT54On2EgagcIBfZSgQtuMOF3zeWAmZmAM4FJoDD11N0eGNB0GhuFcLgmdQ\\njiVrQ8D5jNLlMbhaXO9KmXpgc3rotOsC5uhVko4mSeuf1WT71FkFa472wfYJkdFA\\n2r/TIJudVEdxaWcgonP212x9RJHhaAk0Wrhd7w8HZhtXQeYIvurZzzpkOGCJq2Jd\\ngw+mhAiBKKBftwkAwhIVQEKUphKtH+YvMIozA3K1QxS6w0r+I0+mZABO4v6C0nsJ\\n7n+PlmnSv3zMq9zypL8cP+wpmb1YVxN0ru4IK1cIAQKBgQDX9NZ5G0/Dx4KAP21v\\nComf7kznQOc/mlJlvG5oSuw1SvoF7AA9/ypF5G1BtCG7XAmjdlNE1mAV5nCQViTK\\nsBBlVKCYRIlgoSdVtMVqTiuGqvLLdY3Rv+el0WrPB5pRRE8q8t97b7b9H40f+Cqc\\naDayBasWBk/Atg1FjBRerQ1sbwKBgQC8yPyuEzp78WquomoueFfDEdQt5Ex+XTdQ\\nrYlzal+PGPqX82otThQl8zLyoAb0poDyBApX7BH/7/1UUfC1f/5L4D0WezJFzj43\\nRLB1P3yGFHATEejn8HLCyuQFNYTVgk0rhewg4UwHpu8+jUGBdDUcP0Kc3r3/LZ0Z\\ndekN7roBwQKBgCPU8gkiKPf5EIQrAgNcoj0xEv2D3VrGRkmvHDqdw9eL2zREVj3z\\nKpZyMlamhrpJqSfAKEzRrRu1IpQwVuZylCXcBtF8/bZUxuwHlIHw+nPbxXFQzfkx\\neEQhHTHAtzAov2IG7mHSxW/2XjohuSA+gmTDYAHFhlIZYtZZSb/zwrhtAoGBAInD\\nnekmLQqfjPttmFDbDyhSDWWD8XJRcflU+jYYTS2uy8gxIK15Cej7xZUaxJiqHPT/\\nj9DDfAsqRdLPjPnWMmuKcunB81jPfcV1QdP+BVAPAA5ahn0jkYum5akLeikY0lnN\\nfBgucP4wiuw5xrDCbbN0UpcJUNsznS4kRnMdX+3BAoGBAJ9ed8wAVfWf0qx/eRfm\\nHAHSYteokWTH7tF2Z8MOlPANy1gbwaffqi1VbuIPPdA+Dl2PZnxEkgXcu9OgltzI\\nyHIv4TQXNsj/k28tITHawQ67cWQxBJs8WZW2l7ZZYreN4cIpUZ2JNhKnCj4qD3SM\\nJaONODDhS9Zf33Bvuymmg04Y\\n-----END PRIVATE KEY-----\\n".replace(/\\n/g, '\n'),
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
export async function updateUser(payload: any): Promise<UpdateUserOutput> {
  return updateUserFlow(payload);
}

const updateUserFlow = ai.defineFlow(
  {
    name: 'updateUserFlow',
    inputSchema: ServerUpdateUserInputSchema,
    outputSchema: UpdateUserOutputSchema,
  },
  async (payload) => {
    await initializeAdmin();
    const adminAuth = getAuth(adminApp);
    const adminFirestore = getFirestore(adminApp);
    const { uid, password, ...profileData } = payload;
    
    try {
      const displayName = `${payload.firstName} ${payload.middleName ? payload.middleName + ' ' : ''}${payload.lastName}`;
      
      // 1. Update Firebase Authentication
      const authUpdate: { displayName: string, password?: string } = { displayName };
      if (password) {
        authUpdate.password = password;
      }
      await adminAuth.updateUser(uid, authUpdate);

      // 2. Update Firestore document
      const userProfileRef = adminFirestore.collection('users').doc(uid);
      const dataToUpdate = {
        ...profileData,
        displayName: displayName,
      };

      await userProfileRef.update(dataToUpdate);

      return { success: true };

    } catch (error: any) {
      console.error('Error updating user:', error);
      let errorMessage = 'An unexpected error occurred.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'This user no longer exists.';
      } else if (error.code === 'auth/invalid-password' && password) {
        errorMessage = 'The new password is not strong enough. It must be at least 6 characters long.';
      } else {
        errorMessage = error.message;
      }
      return { success: false, error: errorMessage };
    }
  }
);
