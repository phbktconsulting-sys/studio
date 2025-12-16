
'use client';

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
import { useUser, useAuth as useFirebaseAuth, useDoc, useMemoFirebase, useFirebase } from '@/firebase';
import { LifeBuoy, LogOut, User as UserIcon, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useTabs } from '@/contexts/tab-context';
import { doc } from 'firebase/firestore';

interface AppSettings {
  logo?: string;
}

export function AppHeader() {
  const { user } = useUser();
  const auth = useFirebaseAuth();
  const { firestore } = useFirebase();
  const router = useRouter();
  const { openTab } = useTabs();

  const appSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'app');
  }, [firestore]);

  const { data: appSettings } = useDoc<AppSettings>(appSettingsRef);

  const handleLogout = () => {
    if (auth) {
      signOut(auth);
    }
    router.push('/login');
  };

  const handleNewWork = () => {
    openTab({
      id: 'new-work-item',
      title: 'New Work',
      type: 'work-item', // Using 'work-item' type to render the view, but with a special ID
    });
  };

  return (
    <div className="contents">
      <header className="flex h-24 items-center justify-between border-b bg-card px-4 md:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-4">
             <LogoIcon src={appSettings?.logo} className="h-16 w-16" />
            <div className="flex flex-col font-headline text-lg font-bold leading-tight">
              <span>PHBKT</span>
              <span>Group</span>
              <span>Limited</span>
            </div>
          </Link>
        </div>

        <div className="flex-1 text-center">
            <span className="font-headline text-lg font-bold">PHBKT-WorkFlow App</span>
            <p className="text-sm text-muted-foreground">Home Page - {user?.displayName || user?.email}</p>
        </div>

        <div className="flex items-center gap-4">
          <Button onClick={handleNewWork} className="h-8 bg-black text-white hover:bg-black/80">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Work
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="relative h-8 w-auto px-4 bg-black text-white hover:bg-black/80">
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
    </div>
  );
}
