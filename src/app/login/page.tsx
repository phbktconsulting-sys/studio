'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFirebase, initiateEmailSignIn } from '@/firebase';
import { Fingerprint } from 'lucide-react';
import { LogoIcon } from '@/components/icons';
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  const router = useRouter();
  const { auth, user, isUserLoading } = useFirebase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    initiateEmailSignIn(auth, email, password);
  };

  if (isUserLoading || (!isUserLoading && user)) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
       <header className="absolute top-0 left-0 right-0 p-4 bg-white border-b">
        <div className="container mx-auto flex justify-between items-center">
            <Link href="/" className="flex items-center gap-4">
              <LogoIcon height={40} width={40} />
              <div className="font-headline text-lg font-bold leading-tight">
                <div className="flex flex-col text-sm leading-snug text-black">
                  <span>PHBKT</span>
                  <span>Group</span>
                  <span>Limited</span>
                </div>
              </div>
            </Link>
            <Button asChild>
                <Link href="/lead-capture">Contact Sales</Link>
            </Button>
        </div>
      </header>
      <div className="w-full max-w-sm pt-20">
        <Card className="py-6">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center pt-4">
                <LogoIcon className="h-16 w-16" />
            </div>
            <CardTitle className="font-headline text-2xl">Sign In</CardTitle>
            <CardDescription className="text-sm">Enter your credentials to access your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="#" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full mt-4">
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
