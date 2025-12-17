'use server';
/**
 * @fileOverview A server-side flow for securely creating multiple Work Items from an Excel upload.
 * This flow uses the Firebase Admin SDK to create work items in a batch,
 * atomically incrementing counters and handling customer lookups.
 *
 * - batchCreateWorkItems - The exported function to be called from the client.
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
import { z } from 'zod';

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
    adminApp = initializeApp({ credential: cert(serviceAccount) });
  } catch (e: any) {
    throw new Error(`Failed to initialize Firebase Admin SDK: ${e.message}`);
  }
  return adminApp;
}

const BatchWorkItemSchema = z.object({
  process: z.string(),
  assignedTo: z.string(),
  createdBy: z.string(),
  items: z.array(z.object({
      customerName: z.string(),
      customerEmail: z.string().email(),
      customerPhone: z.string(),
      customerPhoneSecondary: z.string().optional(),
      customerAddress: z.string().optional(),
      overview: z.string(),
    })
  ),
});

const BatchCreateResponseSchema = z.object({
  successCount: z.number(),
  error: z.string().optional(),
});

export async function batchCreateWorkItems(payload: any): Promise<z.infer<typeof BatchCreateResponseSchema>> {
  return batchCreateWorkItemsFlow(payload);
}

const batchCreateWorkItemsFlow = ai.defineFlow(
  {
    name: 'batchCreateWorkItemsFlow',
    inputSchema: BatchWorkItemSchema,
    outputSchema: BatchCreateResponseSchema,
  },
  async (payload) => {
    await initializeAdmin();
    const adminFirestore = getFirestore(adminApp);
    
    const processToPrefix: Record<string, string> = {
      'Request Information': 'RI', 'Request Quotation': 'RQ', 'Request Application': 'RA',
      'Request Website': 'RW', 'Request inquiry': 'RIQ', 'Request Backend Support': 'RBS', 'Request Other': 'RO',
    };
    const prefix = processToPrefix[payload.process];
    if (!prefix) {
      return { successCount: 0, error: 'Invalid process type specified.' };
    }

    const workItemCounterRef = adminFirestore.collection('counters').doc(`work_item_${prefix}`);
    const customerCounterRef = adminFirestore.collection('counters').doc('customer_unique_id');
    const customersRef = adminFirestore.collection('customers');
    const workItemsRef = adminFirestore.collection('work_items');

    try {
      await adminFirestore.runTransaction(async (transaction) => {
        // Pre-fetch all documents needed to avoid contention
        const customerEmails = payload.items.map(item => item.customerEmail.toLowerCase());
        const customerDocsToFetch = customerEmails.length > 0 ? customerEmails.map(email => customersRef.doc(email)) : [];
        const existingCustomerDocs = customerDocsToFetch.length > 0 ? await transaction.getAll(...customerDocsToFetch) : [];
        const workItemCounterDoc = await transaction.get(workItemCounterRef);
        const customerCounterDoc = await transaction.get(customerCounterRef);

        let workItemCounter = workItemCounterDoc.exists ? workItemCounterDoc.data()!.count : 10001;
        let customerCounter = customerCounterDoc.exists ? customerCounterDoc.data()!.count : 24000;
        
        const customerCache = new Map<string, string>();
        existingCustomerDocs.forEach(doc => {
            if (doc.exists) {
                customerCache.set(doc.id, doc.data()!.customerUniqueId);
            }
        });

        for (const item of payload.items) {
          const customerEmail = item.customerEmail.toLowerCase();
          let customerUniqueId = customerCache.get(customerEmail);
          const isNewCustomer = !customerUniqueId;

          if (isNewCustomer) {
            customerUniqueId = customerCounter.toString();
            customerCounter++;
          }
          
          const newWorkItemRef = workItemsRef.doc();
          const customId = `${prefix}-${workItemCounter}`;
          workItemCounter++;
          
          transaction.set(newWorkItemRef, {
            id: newWorkItemRef.id,
            customId,
            process: payload.process,
            urgency: 'Medium', // Default urgency for batch-created items
            status: 'Open',
            subject: `${payload.process} for ${item.customerName}`,
            assignedTo: payload.assignedTo,
            createdBy: payload.createdBy,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            relatedContact: {
              name: item.customerName,
              email: item.customerEmail,
              phone: item.customerPhone,
              phoneSecondary: item.customerPhoneSecondary || '',
              address: item.customerAddress || '',
              customerUniqueId,
            },
            overview: item.overview,
            tasks: [],
          });

          // Update customer record
          const customerDocRef = customersRef.doc(customerEmail);
          const customerDataToSet = {
                id: customerEmail,
                email: customerEmail,
                customerUniqueId: customerUniqueId,
                name: item.customerName,
                phone: item.customerPhone,
                address: item.customerAddress || '',
          };
           if (isNewCustomer) {
                transaction.set(customerDocRef, {
                    ...customerDataToSet,
                    createdAt: new Date().toISOString(),
                });
            } else {
                transaction.update(customerDocRef, customerDataToSet);
            }
        }

        // Update counters at the end
        transaction.set(workItemCounterRef, { count: workItemCounter }, { merge: true });
        transaction.set(customerCounterRef, { count: customerCounter }, { merge: true });
      });

      return { successCount: payload.items.length };

    } catch (error: any) {
      console.error('Error in batch create transaction:', error);
      return { successCount: 0, error: error.message || 'An unexpected error occurred during batch creation.' };
    }
  }
);
