'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// This function is designed to be a stable singleton provider for Firebase services.
export function initializeFirebase() {
  // If no Firebase app has been initialized yet, do it now with the provided config.
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }

  // Get the (now guaranteed to be initialized) app instance.
  const firebaseApp = getApp();

  // Return the initialized services.
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
