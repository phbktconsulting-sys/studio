
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, UploadCloud } from 'lucide-react';
import Image from 'next/image';

interface ManageAppProps {
  onBack: () => void;
}

export function ManageApp({ onBack }: ManageAppProps) {
  const { toast } = useToast();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    // On mount, load the logo from localStorage
    const storedLogo = localStorage.getItem('customLogo');
    if (storedLogo) {
      setLogoPreview(storedLogo);
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Please select an image smaller than 2MB.',
        });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveLogo = () => {
    if (logoPreview) {
      localStorage.setItem('customLogo', logoPreview);
      // Dispatch a storage event to notify other tabs/components
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'customLogo',
          newValue: logoPreview,
        })
      );
      toast({
        title: 'Logo Updated',
        description: 'The application logo has been successfully updated.',
      });
      onBack();
    } else {
      toast({
        variant: 'destructive',
        title: 'No Logo Selected',
        description: 'Please upload an image to set as the logo.',
      });
    }
  };
  
  const handleRemoveLogo = () => {
    localStorage.removeItem('customLogo');
    window.dispatchEvent(new StorageEvent('storage', { key: 'customLogo', newValue: null }));
    setLogoPreview(null);
    setLogoFile(null);
    if(fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast({
        title: 'Logo Removed',
        description: 'The custom logo has been removed. The default logo will be used.',
      });
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div>
          <h1 className="font-headline text-lg font-bold tracking-tight">Manage Application</h1>
          <p className="text-xs text-muted-foreground">Update general application settings.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Application Logo</CardTitle>
          <CardDescription className="text-xs">Upload a new logo for the application header. The image should be square.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="logo-upload">Logo Image</Label>
            <div
              className="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 hover:border-gray-400"
              onClick={() => fileInputRef.current?.click()}
            >
              {logoPreview ? (
                <Image src={logoPreview} alt="Logo preview" width={80} height={80} className="rounded-md object-contain" />
              ) : (
                <div className="text-center">
                  <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 2MB</p>
                </div>
              )}
              <Input
                ref={fileInputRef}
                id="logo-upload"
                type="file"
                className="sr-only"
                accept="image/png, image/jpeg, image/gif"
                onChange={handleFileChange}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="destructive" onClick={handleRemoveLogo}>Remove Logo</Button>
            <Button onClick={handleSaveLogo} disabled={!logoFile && !logoPreview}>Save Logo</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
