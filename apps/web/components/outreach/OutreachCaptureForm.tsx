'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { OutreachCaptureSchema } from '@church-hub/shared-types';
import { z } from 'zod';
import { Camera, Loader2, MapPin, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  cacheForm,
  getCachedForm,
  queueOutreachCapture,
  OUTREACH_FORM_CACHE_ID,
} from '@/lib/offline-sync';
import { VoiceNotesField } from '@/components/outreach/VoiceNotesField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const formSchema = OutreachCaptureSchema;
type FormData = z.infer<typeof formSchema>;

interface OutreachCaptureFormProps {
  online: boolean;
  onSuccess: () => void;
  evangelistId?: string;
  qrCodeId?: string;
}

export function OutreachCaptureForm({
  online,
  onSuccess,
  evangelistId,
  qrCodeId,
}: OutreachCaptureFormProps) {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(formSchema),
      defaultValues: { photoConsent: false },
    });

  const photoConsent = watch('photoConsent');
  const needsBusPickup = watch('needsBusPickup');
  const voiceNotes = watch('voiceNotes') ?? '';

  useEffect(() => {
    getCachedForm(OUTREACH_FORM_CACHE_ID).then((cached) => {
      if (cached?.data) {
        Object.entries(cached.data).forEach(([k, v]) => {
          if (v !== undefined) setValue(k as keyof FormData, v as never);
        });
      }
    });
  }, [setValue]);

  const captureGps = () => {
    if (!navigator.geolocation) {
      toast.error('GPS not supported on this device');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setValue('latitude', pos.coords.latitude);
        setValue('longitude', pos.coords.longitude);
        toast.success('Location tagged');
        setGpsLoading(false);
      },
      () => {
        toast.error('Could not get GPS location');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!photoConsent) {
      toast.error('Enable photo consent before capturing');
      return;
    }
    if (file.size > 800_000) {
      toast.error('Photo too large — use a smaller image');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhotoPreview(dataUrl);
      setValue('photoUrl', dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: FormData) => {
    const payload: FormData = {
      ...data,
      clientId: crypto.randomUUID(),
      capturedAt: new Date().toISOString(),
      evangelistId,
      qrCodeId,
      latitude: coords?.lat ?? data.latitude,
      longitude: coords?.lng ?? data.longitude,
    };

    await cacheForm(OUTREACH_FORM_CACHE_ID, payload);

    try {
      if (!navigator.onLine) {
        await queueOutreachCapture(payload as Record<string, unknown>);
        toast.success('Saved offline — will sync when connected');
        reset({ photoConsent: false });
        setPhotoPreview(null);
        setCoords(null);
        onSuccess();
        return;
      }
      await api.post('/outreach/capture', payload);
      toast.success('Contact captured — follow-up team notified & welcome sent');
      reset({ photoConsent: false });
      setPhotoPreview(null);
      setCoords(null);
      onSuccess();
    } catch {
      await queueOutreachCapture(payload as Record<string, unknown>);
      toast.info('Queued offline — will sync automatically');
      reset({ photoConsent: false });
      setPhotoPreview(null);
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {!online && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <WifiOff className="h-4 w-4 shrink-0" />
          Offline mode — captures are stored locally until you reconnect.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="First name *" {...register('firstName')} required />
        <Input placeholder="Last name" {...register('lastName')} />
        <Input placeholder="Phone" {...register('phone')} />
        <Input placeholder="Email" type="email" {...register('email')} />
        <Input
          placeholder="Location label (e.g. Dartford town centre)"
          className="sm:col-span-2"
          {...register('locationLabel')}
        />
        <div className="sm:col-span-2">
          <VoiceNotesField
            value={voiceNotes}
            onChange={(t) => {
              setValue('voiceNotes', t);
              setValue('notes', t);
            }}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" {...register('needsBusPickup')} className="rounded" />
          Needs bus pickup to church
        </label>
        {needsBusPickup && (
          <>
            <Input
              placeholder="Pickup address (or use GPS tag above)"
              {...register('pickupAddress')}
            />
            <Input placeholder="Bus notes (e.g. Sunday 9am)" {...register('busPickupNotes')} />
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={captureGps} disabled={gpsLoading}>
          {gpsLoading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="mr-1.5 h-4 w-4" />
          )}
          Tag GPS location
        </Button>
        {coords && (
          <span className="self-center text-xs text-muted-foreground">
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" {...register('photoConsent')} className="rounded" />
          Photo consent given
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Required before taking a photo. Stored securely with the contact record.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label
            className={cn(
              'inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm',
              photoConsent ? 'border-primary bg-primary/5' : 'opacity-50 pointer-events-none',
            )}
          >
            <Camera className="h-4 w-4" />
            Take / upload photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onPhotoChange}
              disabled={!photoConsent}
            />
          </label>
          {photoPreview && (
            <img
              src={photoPreview}
              alt="Contact"
              className="h-16 w-16 rounded-lg border object-cover"
            />
          )}
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full shadow-brand">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Capture contact'}
      </Button>
    </form>
  );
}
