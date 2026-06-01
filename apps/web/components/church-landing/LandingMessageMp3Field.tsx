'use client';

import { useRef, useState } from 'react';
import { Headphones, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { uploadLandingMessageMp3 } from '@/lib/upload-landing-message-mp3';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LandingMessageMp3Field({
  mediaUrl,
  disabled,
  onMediaUrlChange,
}: {
  mediaUrl: string;
  disabled?: boolean;
  onMediaUrlChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file || disabled) return;
    setUploading(true);
    try {
      const { url } = await uploadLandingMessageMp3(file);
      onMediaUrlChange(url);
      toast.success('MP3 uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload audio');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      <Label>MP3 URL or upload from device</Label>
      {mediaUrl ? (
        <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Headphones className="h-3.5 w-3.5" />
            Preview
          </div>
          <audio controls preload="none" className="w-full" src={mediaUrl}>
            Your browser does not support audio playback.
          </audio>
        </div>
      ) : null}
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={mediaUrl}
          disabled={disabled}
          onChange={(e) => onMediaUrlChange(e.target.value)}
          placeholder="https://… or upload MP3"
          className="min-w-0 flex-1"
        />
        <input
          ref={fileRef}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/mp4,audio/m4a,.mp3,.m4a,.wav"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={disabled || uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Upload MP3
        </Button>
      </div>
    </div>
  );
}
