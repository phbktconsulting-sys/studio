'use client';

import React, { type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

// Initialize Firebase services ONCE at the module level.
// This ensures it's a true singleton on the client side.
const firebaseServices = initializeFirebase();

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // The services are now constant, so no state or effect is needed.
  if (!firebaseServices) {
    // This case should ideally not be hit if initialization is successful.
    // You can render a loading spinner or an error message here.
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <p>Error initializing Firebase...</p>
      </div>
    );
  }

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
