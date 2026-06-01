'use client';

import { useRef, useState } from 'react';
import { Camera, ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { uploadProfileAvatar } from '@/lib/upload-profile-avatar';
import { UserAvatar } from '@/components/app/UserAvatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProfilePhotoUploadProps {
  displayUser: {
    firstName?: string;
    lastName?: string;
    nickname?: string | null;
    avatarUrl?: string | null;
  };
  avatarUrl: string;
  disabled?: boolean;
  onAvatarUrlChange: (url: string) => void;
  onAutoSaved?: (url: string) => void | Promise<void>;
}

function uploadErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const detail = err.response?.data?.message;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.join(', ');
    if (err.response?.status === 404) {
      return 'Photo upload endpoint not found — restart the API server (auth/profile-avatar).';
    }
  }
  if (err instanceof Error) return err.message;
  return 'Could not upload photo';
}

export function ProfilePhotoUpload({
  displayUser,
  avatarUrl,
  disabled,
  onAvatarUrlChange,
  onAutoSaved,
}: ProfilePhotoUploadProps) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const previewUser = {
    ...displayUser,
    avatarUrl: avatarUrl || null,
  };

  const handleFile = async (file: File | undefined) => {
    if (!file || disabled) return;
    setUploading(true);
    try {
      const { url } = await uploadProfileAvatar(file);
      onAvatarUrlChange(url);
      if (onAutoSaved) {
        await onAutoSaved(url);
      } else {
        toast.success('Photo uploaded — tap Save profile to keep other changes');
      }
    } catch (err) {
      toast.error(uploadErrorMessage(err));
    } finally {
      setUploading(false);
      if (galleryRef.current) galleryRef.current.value = '';
      if (cameraRef.current) cameraRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative">
          <UserAvatar
            user={previewUser}
            className={cn('h-24 w-24', uploading && 'opacity-60')}
            fallbackClassName="text-xl"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 sm:items-start">
          <p className="text-center text-sm text-muted-foreground sm:text-left">
            Choose from your gallery or take a new photo with your camera.
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              className="hidden"
              aria-hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              aria-hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => galleryRef.current?.click()}
            >
              <ImageIcon className="mr-1.5 h-4 w-4" />
              Gallery
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => cameraRef.current?.click()}
            >
              <Camera className="mr-1.5 h-4 w-4" />
              Camera
            </Button>
            {avatarUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || uploading}
                onClick={() => onAvatarUrlChange('')}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
