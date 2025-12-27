'use client';

import { Toaster } from '@/components/ui/toaster';
import { LogoIcon } from '@/components/icons';
import Link from 'next/link';

export default function LeadCaptureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased bg-slate-50">
        <header className="p-4 bg-background border-b">
             <Link href="/" className="flex items-center gap-4">
              <LogoIcon height={40} width={40} />
              <div className="font-headline text-lg font-bold leading-tight">
                <div className="flex flex-col text-sm leading-snug">
                  <span>PHBKT</span>
                  <span>Group</span>
                  <span>Limited</span>
                </div>
              </div>
            </Link>
        </header>
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
