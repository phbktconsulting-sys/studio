'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogoIcon } from '@/components/icons';
import { useUser, useAuth as useFirebaseAuth } from '@/firebase';
import { LifeBuoy, LogOut, PlusCircle, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { NewWorkItemDialog } from './new-work-item-dialog';

export function AppHeader() {
  const { user } = useUser();
  const auth = useFirebaseAuth();
  const router = useRouter();
  const [isNewWorkItemOpen, setIsNewWorkItemOpen] = useState(false);

  const handleLogout = () => {
    if (auth) {
      signOut(auth);
    }
    router.push('/login');
  };

  return (
    <>
      <header className="flex h-16 items-center border-b bg-card px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <LogoIcon className="h-8 w-8" />
          <span className="font-headline text-lg font-bold">PHBKT Group Limited</span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <Button variant="outline" onClick={() => setIsNewWorkItemOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Work
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-auto px-4">
                <UserIcon className="mr-2 h-4 w-4" />
                {user?.displayName || user?.email}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <LifeBuoy className="mr-2 h-4 w-4" />
                <span>Support</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <NewWorkItemDialog open={isNewWorkItemOpen} onOpenChange={setIsNewWorkItemOpen} />
    </>
  );
}
