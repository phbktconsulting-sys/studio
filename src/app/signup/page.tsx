
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogoIcon } from '@/components/icons';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFirebase, initiateEmailSignUp, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User as AuthUser } from 'firebase/auth';

export default function SignupPage() {
  const router = useRouter();
  const { auth, firestore, user, isUserLoading } = useFirebase();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLogo = localStorage.getItem('customLogo');
      if (storedLogo) {
        setCustomLogo(storedLogo);
      }
    }
  }, []);
  
  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);
  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((newUser: AuthUser | null) => {
      // We only want to create the user doc right after they sign up.
      // onAuthStateChanged fires on every auth state change, so we need to be careful.
      // The `user` from our `useFirebase` hook might still be the old one (or null).
      // A simple way to check if this is a "new" signup is to see if a `displayName` has been entered.
      if (newUser && firestore && displayName && !newUser.displayName) {
        const userProfile = {
          id: newUser.uid,
          uid: newUser.uid,
          email: newUser.email,
          displayName: displayName,
          role: 'User',
        };
        const userDocRef = doc(firestore, `users/${newUser.uid}`);
        setDocumentNonBlocking(userDocRef, userProfile, { merge: true });
      }
    });

    return () => unsubscribe();
  }, [auth, firestore, displayName, router]);

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName) {
      // You might want to show an error to the user here
      console.error("Display name is required");
      return;
    }
    initiateEmailSignUp(auth, email, password);
  };
  
    if (isUserLoading || (!isUserLoading && user)) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <LogoIcon src={customLogo} className="h-16 w-16" />
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="font-headline text-2xl">Create an Account</CardTitle>
            <CardDescription>
              Enter your details to get started with PHBKT Group.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
               <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" type="text" placeholder="Ellen Ripley" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="ellen.ripley@phbkt.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full">
                Create Account
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Sign In
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
