'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { OutreachCaptureSchema } from '@church-hub/shared-types';
import { z } from 'zod';
import { Camera, Loader2, MapPin, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  cacheForm,
  clearCachedForm,
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

const EMPTY_FORM: Partial<FormData> = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  postcode: '',
  locationLabel: '',
  notes: '',
  voiceNotes: '',
  needsBusPickup: false,
  pickupAddress: '',
  busPickupNotes: '',
  photoConsent: false,
  photoUrl: undefined,
  latitude: undefined,
  longitude: undefined,
  clientId: undefined,
  capturedAt: undefined,
};

interface OutreachCaptureFormProps {
  online: boolean;
  onSuccess: () => void;
  evangelistId?: string;
  qrCodeId?: string;
}

/** Remounts after each save so the form is blank for the next capture. */
export function OutreachCaptureForm(props: OutreachCaptureFormProps) {
  const [sessionKey, setSessionKey] = useState(0);
  return (
    <OutreachCaptureFormInner
      key={sessionKey}
      {...props}
      onReadyForNext={() => setSessionKey((k) => k + 1)}
    />
  );
}

function OutreachCaptureFormInner({
  online,
  onSuccess,
  evangelistId,
  qrCodeId,
  onReadyForNext,
}: OutreachCaptureFormProps & { onReadyForNext: () => void }) {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [postcodeHints, setPostcodeHints] = useState<string[]>([]);
  const [postcodeBusy, setPostcodeBusy] = useState(false);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allowDraftRestore = useRef(true);

  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(formSchema),
      defaultValues: EMPTY_FORM,
    });

  const photoConsent = watch('photoConsent');
  const needsBusPickup = watch('needsBusPickup');
  const voiceNotes = watch('voiceNotes') ?? '';
  const postcode = watch('postcode') ?? '';

  useEffect(() => {
    let cancelled = false;
    getCachedForm(OUTREACH_FORM_CACHE_ID).then((cached) => {
      if (cancelled || !allowDraftRestore.current || !cached?.data) return;
      Object.entries(cached.data).forEach(([k, v]) => {
        if (v !== undefined) setValue(k as keyof FormData, v as never);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [setValue]);

  useEffect(() => {
    return () => {
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
      if (lookupTimer.current) clearTimeout(lookupTimer.current);
    };
  }, []);

  const applyPostcodeLookup = async (code: string) => {
    const q = code.trim();
    if (q.length < 5) return;
    setPostcodeBusy(true);
    try {
      const { data } = await api.get<{
        postcode: string;
        latitude: number;
        longitude: number;
        adminDistrict: string | null;
        parish: string | null;
        region: string | null;
      }>(`/geo/postcode/${encodeURIComponent(q)}`);
      setValue('postcode', data.postcode);
      setValue('latitude', data.latitude);
      setValue('longitude', data.longitude);
      setCoords({ lat: data.latitude, lng: data.longitude });
      const label = [data.parish, data.adminDistrict, data.region].filter(Boolean).join(', ');
      if (label) {
        setValue('locationLabel', label);
      }
      setPostcodeHints([]);
      toast.success(`Postcode found — location tagged (${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)})`);
    } catch {
      toast.error('Postcode not found');
    } finally {
      setPostcodeBusy(false);
    }
  };

  const onPostcodeChange = (value: string) => {
    setValue('postcode', value.toUpperCase());
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    const q = value.trim();
    if (q.length < 2) {
      setPostcodeHints([]);
      return;
    }
    suggestTimer.current = setTimeout(() => {
      void (async () => {
        try {
          const { data } = await api.get<string[]>('/geo/postcode-autocomplete', {
            params: { q },
          });
          setPostcodeHints(Array.isArray(data) ? data : []);
        } catch {
          setPostcodeHints([]);
        }
      })();
    }, 280);

    const compact = q.replace(/\s+/g, '');
    if (compact.length >= 5 && compact.length <= 7) {
      lookupTimer.current = setTimeout(() => {
        void applyPostcodeLookup(q);
      }, 600);
    }
  };

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
    if (!/^image\//.test(file.type)) {
      toast.error('Only image files are allowed');
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

  const prepareNextCapture = async () => {
    allowDraftRestore.current = false;
    await clearCachedForm(OUTREACH_FORM_CACHE_ID);
    reset(EMPTY_FORM);
    setPhotoPreview(null);
    setCoords(null);
    setPostcodeHints([]);
    onSuccess();
    onReadyForNext();
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

    // Keep a draft only until save completes (crash safety while request is in flight).
    await cacheForm(OUTREACH_FORM_CACHE_ID, payload);

    try {
      if (!navigator.onLine) {
        await queueOutreachCapture(payload as Record<string, unknown>);
        toast.success('Saved offline — will sync when connected');
        await prepareNextCapture();
        return;
      }
      await api.post('/outreach/capture', payload);
      toast.success('Contact captured — follow-up team notified & welcome sent');
      await prepareNextCapture();
    } catch {
      await queueOutreachCapture(payload as Record<string, unknown>);
      toast.info('Queued offline — will sync automatically');
      await prepareNextCapture();
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
        <div className="relative sm:col-span-2">
          <div className="flex gap-2">
            <Input
              placeholder="UK postcode (e.g. DA1 1AA)"
              value={postcode}
              onChange={(e) => onPostcodeChange(e.target.value)}
              onBlur={() => {
                if ((postcode ?? '').trim().length >= 5) {
                  void applyPostcodeLookup(postcode);
                }
              }}
              autoComplete="postal-code"
            />
            <Button
              type="button"
              variant="outline"
              disabled={postcodeBusy || !(postcode ?? '').trim()}
              onClick={() => void applyPostcodeLookup(postcode)}
            >
              {postcodeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lookup'}
            </Button>
          </div>
          {postcodeHints.length > 0 ? (
            <ul className="absolute z-20 mt-1 max-h-40 w-full overflow-auto rounded-md border bg-card shadow-md">
              {postcodeHints.map((hint) => (
                <li key={hint}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setValue('postcode', hint);
                      setPostcodeHints([]);
                      void applyPostcodeLookup(hint);
                    }}
                  >
                    {hint}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
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
              placeholder="Pickup address (or use GPS / postcode above)"
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
            />
          </label>
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreview} alt="Capture preview" className="h-16 w-16 rounded-md object-cover" />
          ) : null}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save capture
      </Button>
    </form>
  );
}
