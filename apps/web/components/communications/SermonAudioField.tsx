'use client';

import { useRef, useState } from 'react';
import { Headphones, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { readLocalAudioDurationSec, uploadSermonAudio } from '@/lib/upload-sermon-audio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SermonAudioField({
  audioUrl,
  disabled,
  onAudioUrlChange,
  onDurationSec,
}: {
  audioUrl: string;
  disabled?: boolean;
  onAudioUrlChange: (url: string) => void;
  onDurationSec?: (seconds: number | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file || disabled) return;
    setUploading(true);
    try {
      const duration = await readLocalAudioDurationSec(file);
      const { url } = await uploadSermonAudio(file);
      onAudioUrlChange(url);
      if (duration != null) onDurationSec?.(duration);
      toast.success(
        duration != null
          ? `Audio uploaded (${Math.round(duration / 60)} min)`
          : 'Audio uploaded',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload audio');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="sm:col-span-2">
      <Label>Audio — URL or upload from device</Label>
      {audioUrl ? (
        <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Headphones className="h-3.5 w-3.5" />
            Preview
          </div>
          <audio controls preload="none" className="w-full" src={audioUrl}>
            Your browser does not support audio playback.
          </audio>
        </div>
      ) : null}
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={audioUrl}
          disabled={disabled || uploading}
          onChange={(e) => onAudioUrlChange(e.target.value)}
          placeholder="https://… or upload MP3 / WAV / M4A"
          className="min-w-0 flex-1"
        />
        <input
          ref={fileRef}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/m4a,.mp3,.m4a,.wav"
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
          Upload audio
        </Button>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        MP3, WAV, or M4A up to 50 MB. Uploaded files are hosted for Spirify playback.
      </p>
    </div>
  );
}
