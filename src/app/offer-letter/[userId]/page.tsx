'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import type { User } from '@/lib/types';
import { generateOfferLetter } from '@/ai/flows/generate-offer-letter-flow';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import { LogoIcon } from '@/components/icons';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function OfferLetterPage() {
  const params = useParams();
  const userId = params.userId as string;
  const router = useRouter();
  const { firestore } = useFirebase();
  const [letterContent, setLetterContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const letterRef = useRef<HTMLDivElement>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return doc(firestore, 'users', userId);
  }, [firestore, userId]);

  const { data: userProfile, isLoading: isUserLoading } = useDoc<User>(userProfileRef);

  useEffect(() => {
    if (userProfile && !isUserLoading) {
      setIsGenerating(true);
      generateOfferLetter(userProfile)
        .then((result) => {
          if (result.offerLetterText) {
            setLetterContent(result.offerLetterText);
          }
        })
        .catch((error) => {
          console.error('Error generating offer letter:', error);
          setLetterContent('Failed to generate offer letter.');
        })
        .finally(() => {
          setIsGenerating(false);
        });
    }
  }, [userProfile, isUserLoading]);

  const handlePrint = () => {
    if (letterRef.current) {
      html2canvas(letterRef.current, { scale: 2 }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        const width = pdfWidth - 20; // with some margin
        const height = width / ratio;

        let position = 10;
        if (height < pdfHeight) {
            position = (pdfHeight - height) / 2;
        }
        
        pdf.addImage(imgData, 'PNG', 10, position, width, height);
        pdf.save(`Offer_Letter_${userProfile?.displayName?.replace(' ', '_')}.pdf`);
      });
    }
  };

  const isLoading = isUserLoading || isGenerating;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Button>
              <div>
                <h1 className="font-headline text-xl font-bold tracking-tight">Offer Letter</h1>
                <p className="text-sm text-muted-foreground">
                  For {userProfile?.displayName || '...'}
                </p>
              </div>
            </div>
            <Button onClick={handlePrint} disabled={isLoading}>
              <Printer className="mr-2 h-4 w-4" />
              Print to PDF
            </Button>
          </div>
        </div>
      </header>
      <main className="py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={letterRef}
            className="mx-auto max-w-4xl rounded-lg border bg-white p-8 sm:p-12 shadow-lg dark:bg-gray-800"
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-20">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="text-muted-foreground">Generating offer letter...</p>
              </div>
            ) : (
              <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert" style={{ whiteSpace: 'pre-wrap' }}>
                {letterContent.split('---').map((part, index) => (
                  <div key={index} dangerouslySetInnerHTML={{ __html: part.replace(/\[(.*?)\]/g, '<strong>$1</strong>') }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
