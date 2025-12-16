
'use server';
/**
 * @fileOverview A server-side flow for securely creating a Work Item.
 * This flow uses the Firebase Admin SDK to create a work item,
 * atomically incrementing the correct counter to generate a sequential ID.
 * It also creates or retrieves a unique customer ID based on email.
 *
 * - createWorkItem - The exported function to be called from the client.
 */

import { ai } from '@/ai/genkit';
import type { App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import {
  initializeApp,
  cert,
  getApps,
  ServiceAccount,
} from 'firebase-admin/app';
import {
  ServerWorkItemCreateSchema,
  WorkItemCreateResponseSchema,
  type WorkItemCreateResponse,
} from '@/lib/types';

const serviceAccount: ServiceAccount = {
  type: 'service_account',
  project_id: 'studio-8081664490-573e2',
  private_key_id: '4ea2e10f8914e7c221f3d150db31b3df9572b173',
  private_key:
    '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCfQVnwWm1pPGuj\nfs19nR9STXzhmROoioD/jXAeypJn88b3/Tdlio9zIksiJp3rwJKqD/yXX9EoZa1e\nD0AVtw6pI9lDbWnweKyO7zZX8MEAY3HMa08LkB+5t2t6UvfcCR+79WHqXd/mJ2Kl\nkGhHq6NSrOSKWd+O9YgKalYt0y7B9/ur4HPTSJ2M1gEklWim8rNWh/Sef1EQkXDO\ndjAT9fRMYn8UUbGgHwmKgFx9c9eDbOTgQQRfDuAe9UY7m6M2ls/VkkSTGgij2+0m\nHMB28HpowPH00TgHDl0ysQsBJ5yXjpEaUQHYHdmVVKNDNCynB42+B558hPquGjN2\neUB/MS6vAgMBAAECggEAFZq3/h3xBHsTNHWEoFXVue8+fHGtHmArv9S1hnfUr2V9\nczGsIjT54On2EgagcIBfZSgQtuMOF3zeWAmZmAM4FJoDD11N0eGNB0GhuFcLgmdQ\njiVrQ8D5jNLlMbhaXO9KmXpgc3rotOsC5uhVko4mSeuf1WT71FkFa472wfYJkdFA\n2r/TIJudVEdxaWcgonP212x9RJHhaAk0Wrhd7w8HZhtXQeYIvurZzzpkOGCJq2Jd\ngw+mhAiBKKBftwkAwhIVQEKUphKtH+YvMIozA3K1QxS6w0r+I0+mZABO4v6C0nsJ\n7n+PlmnSv3zMq9zypL8cP+wpmb1YVxN0ru4IK1cIAQKBgQDX9NZ5G0/Dx4KAP21v\nComf7kznQOc/mlJlvG5oSuw1SvoF7AA9/ypF5G1BtCG7XAmjdlNE1mAV5nCQViTK\nsBBlVKCYRIlgoSdVtMVqTiuGqvLLdY3Rv+el0WrPB5pRRE8q8t97b7b9H40f+Cqc\naDayBasWBk/Atg1FjBRerQ1sbwKBgQC8yPyuEzp78WquomoueFfDEdQt5Ex+XTdQ\nrYlzal+PGPqX82otThQl8zLyoAb0poDyBApX7BH/7/1UUfC1f/5L4D0WezJFzj43\nRLB1P3yGFHATEejn8HLCyuQFNYTVgk0rhewg4UwHpu8+jUGBdDUcP0Kc3r3/LZ0Z\ndekN7roBwQKBgCPU8gkiKPf5EIQrAgNcoj0xEv2D3VrGRkmvHDqdw9eL2zREVj3z\nKpZyMlamhrpJqSfAKEzRrRu1IpQwVuZylCXcBtF8/bZUxuwHlIHw+nPbxXFQzfkx\neEQhHTHAtzAov2IG7mHSxW/2XjohuSA+gmTDYAHFhlIZYtZZSb/zwrhtAoGBAInD\nnekmLQqfjPttmFDbDyhSDWWD8XJRcflU+jYYTS2uy8gxIK15Cej7xZUaxJiqHPT/\nj9DDfAsqRdLPjPnWMmuKcunB81jPfcV1QdP+BVAPAA5ahn0jkYum5akLeikY0lnN\nfBgucP4wiuw5xrDCbbN0UpcJUNsznS4kRnMdX+3BAoGBAJ9ed8wAVfWf0qx/eRfm\nHAHSYteokWTH7tF2Z8MOlPANy1gbwaffqi1VbuIPPdA+Dl2PZnxEkgXcu9OgltzI\nyHIv4TQXNsj/k28tITHawQ67cWQxBJs8WZW2l7ZZYreN4cIpUZ2JNhKnCj4qD3SM\nJaONODDhS9Zf33Bvuymmg04Y\n-----END PRIVATE KEY-----\n'.replace(
      /\\n/g,
      '\n'
    ),
  client_email:
    'firebase-adminsdk-fbsvc@studio-8081664490-573e2.iam.gserviceaccount.com',
  client_id: '109929678533234167789',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url:
    'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40studio-8081664490-573e2.iam.gserviceaccount.com',
  universe_domain: 'googleapis.com',
} as ServiceAccount;

let adminApp: App;

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

const processToPrefix: Record<string, string> = {
  'Request Information': 'RI',
  'Request Quotation': 'RQ',
  'Request Application': 'RA',
  'Request Website': 'RW',
  'Request inquiry': 'RIQ',
  'Request Backend Support': 'RBS',
  'Request Other': 'RO',
};

// Exported function for client use
export async function createWorkItem(
  payload: any
): Promise<WorkItemCreateResponse> {
  return createWorkItemFlow(payload);
}

const createWorkItemFlow = ai.defineFlow(
  {
    name: 'createWorkItemFlow',
    inputSchema: ServerWorkItemCreateSchema,
    outputSchema: WorkItemCreateResponseSchema,
  },
  async (payload) => {
    await initializeAdmin();
    const adminFirestore = getFirestore(adminApp);

    const prefix = processToPrefix[payload.process];
    if (!prefix) {
      return { error: 'Invalid process type specified.' };
    }

    const workItemCounterRef = adminFirestore
      .collection('counters')
      .doc(`work_item_${prefix}`);
    const customerCounterRef = adminFirestore
      .collection('counters')
      .doc('customer_unique_id');
    const customersRef = adminFirestore.collection('customers');
    const workItemsRef = adminFirestore.collection('work_items');

    try {
      const docRef = await adminFirestore.runTransaction(async (transaction) => {
        // 1. All reads must be done before any writes.
        const customerEmail = payload.relatedContact.email.toLowerCase();
        const customerDocRef = customersRef.doc(customerEmail);

        // Read all necessary documents first.
        const customerDoc = await transaction.get(customerDocRef);
        const customerCounterDoc = await transaction.get(customerCounterRef);
        const workItemCounterDoc = await transaction.get(workItemCounterRef);

        let customerUniqueId: string;
        let isNewCustomer = false;

        if (customerDoc.exists) {
          customerUniqueId = customerDoc.data()!.customerUniqueId;
        } else {
          isNewCustomer = true;
          let nextId = 24000;
          if (customerCounterDoc.exists) {
            nextId = customerCounterDoc.data()!.count;
          }
          customerUniqueId = nextId.toString();
        }

        let nextWorkItemIdNumber = 10001; // Starting ID
        if (workItemCounterDoc.exists) {
          nextWorkItemIdNumber = workItemCounterDoc.data()!.count;
        }

        // 2. Now perform all write operations.
        if (isNewCustomer) {
          transaction.set(customerDocRef, {
            id: customerEmail,
            email: customerEmail,
            customerUniqueId: customerUniqueId,
            createdAt: new Date().toISOString(),
          });
          transaction.set(customerCounterRef, { count: parseInt(customerUniqueId, 10) + 1 }, { merge: true });
        }
        
        // Update work item counter
        transaction.set(workItemCounterRef, { count: nextWorkItemIdNumber + 1 }, { merge: true });
        
        // Create the work item
        const customId = `${prefix}-${nextWorkItemIdNumber}`;
        const newWorkItemRef = workItemsRef.doc();

        const newWorkItemData = {
          ...payload,
          id: newWorkItemRef.id,
          customId,
          status: 'Open',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          subject: `${payload.process} for ${payload.relatedContact.name}`,
          relatedContact: {
            ...payload.relatedContact,
            customerUniqueId: customerUniqueId,
          },
        };

        transaction.set(newWorkItemRef, newWorkItemData);
        
        return newWorkItemRef;
      });
      
      const newWorkItem = (await docRef.get()).data();
      if (!newWorkItem) {
        throw new Error('Failed to retrieve the newly created work item.');
      }


      return { id: docRef.id, customId: newWorkItem.customId };
    } catch (error: any) {
      console.error('Error creating work item:', error);
      return { error: error.message || 'An unexpected error occurred.' };
    }
  }
);
