'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  CheckCircle2,
  Copy,
  Loader2,
  MapPin,
  Megaphone,
  Mic,
  Nfc,
  QrCode,
  Users,
  WifiOff,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type CapturePhase =
  | 'pipeline'
  | 'field-hub'
  | 'capture-form'
  | 'qr-panel'
  | 'saved';

const PHASE_MS: Record<CapturePhase, number> = {
  pipeline: 2800,
  'field-hub': 2600,
  'capture-form': 5200,
  'qr-panel': 2800,
  saved: 3200,
};

const CAPTURE_DEMO = {
  firstName: 'Daniel',
  lastName: 'Mensah',
  phone: '07123 456789',
  postcode: 'DA1 1AA',
  location: 'Dartford town centre',
};

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function typeValue(
  full: string,
  setValue: (v: string) => void,
  reduceMotion: boolean,
) {
  if (reduceMotion) {
    setValue(full);
    return;
  }
  let built = '';
  for (const ch of full) {
    built += ch;
    setValue(built);
    await sleep(24);
  }
}

function PipelineView() {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">Outreach pipeline</p>
      {[
        { label: 'New contacts', count: 48, width: '35%' },
        { label: 'Assigned', count: 32, width: '55%' },
        { label: 'Discipled', count: 18, width: '78%' },
      ].map((stage) => (
        <div key={stage.label} className="rounded-xl border border-border bg-card p-4">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{stage.label}</span>
            <span className="text-muted-foreground">{stage.count}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: stage.width }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function FieldHubView() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Evangelism</p>
          <p className="text-lg font-semibold">Field Outreach</p>
        </div>
        <Badge variant="success">Offline-ready</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total contacts', value: '1,248', icon: Megaphone, tone: 'violet' },
          { label: 'Captured today', value: '34', icon: Users, tone: 'sky' },
          { label: 'Welcome sent', value: '31', icon: CheckCircle2, tone: 'emerald' },
          { label: 'QR / NFC scans', value: '128', icon: QrCode, tone: 'amber' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className={cn(
              'rounded-xl border bg-card p-4',
              tone === 'violet' && 'border-violet-200/60 bg-violet-50/40',
              tone === 'sky' && 'border-sky-200/60 bg-sky-50/40',
              tone === 'emerald' && 'border-emerald-200/60 bg-emerald-50/40',
              tone === 'amber' && 'border-amber-200/60 bg-amber-50/40',
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className="h-7 w-7 text-primary" />
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Opening evangelism capture — offline-first field workflow with GPS tagging and QR links.
      </p>
    </div>
  );
}

function CaptureFormView({
  firstName,
  lastName,
  phone,
  postcode,
  location,
  needsBus,
  saving,
}: {
  firstName: string;
  lastName: string;
  phone: string;
  postcode: string;
  location: string;
  needsBus: boolean;
  saving: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="font-semibold">Outreach Capture Form</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Offline-first capture · auto-assigns to outreach pipeline
          </p>

          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <WifiOff className="h-4 w-4 shrink-0" />
            Offline mode — captures queue locally until reconnect
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input readOnly value={firstName} placeholder="First name *" className={cn(firstName && 'ring-1 ring-primary/30')} />
            <Input readOnly value={lastName} placeholder="Last name" className={cn(lastName && 'ring-1 ring-primary/30')} />
            <Input readOnly value={phone} placeholder="UK phone *" className={cn(phone && 'ring-1 ring-primary/30')} />
            <Input readOnly value="" placeholder="Email (optional)" />
            <div className="flex gap-2 sm:col-span-2">
              <Input readOnly value={postcode} placeholder="UK postcode" className={cn(postcode && 'ring-1 ring-primary/30')} />
              <Button type="button" variant="outline" size="default">
                Lookup
              </Button>
            </div>
            <Input
              readOnly
              value={location}
              placeholder="Location label"
              className={cn('sm:col-span-2', location && 'ring-1 ring-primary/30')}
            />
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 sm:col-span-2">
              <Mic className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Voice note: “Met at market stall, interested in youth group”</span>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-border p-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={needsBus} readOnly className="rounded" />
              Needs bus pickup to church
            </label>
            {needsBus ? (
              <Input readOnly value="12 Riverside Close" placeholder="Pickup address" className="mt-3 ring-1 ring-primary/30" />
            ) : null}
          </div>

          <Button type="button" className="mt-4 w-full" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save Contact'
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-primary" />
            GPS tagged
          </p>
          <p className="mt-2 text-xs text-muted-foreground">51.4462, 0.2169 · Dartford</p>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          Team QR panel on the right →
        </div>
      </div>
    </div>
  );
}

function QrPanelView() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="flex items-center gap-2 font-semibold">
          <QrCode className="h-4 w-4 text-primary" />
          Team QR & NFC Capture
        </p>
        <div className="mt-4 flex justify-center rounded-xl border bg-white p-4">
          <div className="grid h-40 w-40 grid-cols-8 grid-rows-8 gap-0.5 p-2">
            {Array.from({ length: 64 }).map((_, i) => (
              <div
                key={i}
                className={cn('rounded-[1px]', i % 3 === 0 || i % 5 === 0 ? 'bg-foreground' : 'bg-transparent')}
              />
            ))}
          </div>
        </div>
        <p className="mt-3 text-center text-sm font-medium">Demo Community Church</p>
        <p className="text-center text-xs text-muted-foreground">128 scans · church-wide</p>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copy link
          </Button>
        </div>
        <div className="mt-3 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <Nfc className="h-3.5 w-3.5" />
            NFC programming
          </p>
          <p className="mt-1">church-hub.online/outreach/capture?qr=demo-zone-a</p>
        </div>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-semibold">Sync queue</p>
          <p className="mt-1 text-xs text-muted-foreground">1 capture waiting to sync</p>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <WifiOff className="h-4 w-4" />
            Will upload when back online
          </div>
        </div>
        <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-4">
          <p className="text-sm font-semibold text-emerald-900">Field mode</p>
          <p className="mt-1 text-xs text-emerald-800">
            Large touch targets for outdoor evangelism on mobile
          </p>
        </div>
      </div>
    </div>
  );
}

function SavedView() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-4">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        <div>
          <p className="font-semibold text-emerald-900">Successfully Added</p>
          <p className="text-sm text-emerald-800">
            Daniel Mensah added to outreach pipeline · welcome SMS queued
          </p>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">Recent captures</p>
        <div className="mt-3 space-y-2">
          {[
            { name: 'Daniel Mensah', time: 'Just now', zone: 'Zone A' },
            { name: 'Sarah Okonkwo', time: '18m ago', zone: 'Zone B' },
            { name: 'James Adeyemi', time: '1h ago', zone: 'QR scan' },
          ].map((row) => (
            <div
              key={row.name}
              className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{row.name}</p>
                <p className="text-xs text-muted-foreground">
                  {row.zone} · {row.time}
                </p>
              </div>
              <Badge variant="outline">New contact</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type Props = {
  reduceMotion: boolean | null;
  onPhaseLabel?: (label: string) => void;
};

export function MockOutreachEvangelismFlow({ reduceMotion, onPhaseLabel }: Props) {
  const [phase, setPhase] = useState<CapturePhase>('pipeline');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [postcode, setPostcode] = useState('');
  const [location, setLocation] = useState('');
  const [needsBus, setNeedsBus] = useState(false);
  const [saving, setSaving] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const ac = new AbortController();

    const run = async () => {
      const phases: CapturePhase[] = ['pipeline', 'field-hub', 'capture-form', 'qr-panel', 'saved'];
      for (const p of phases) {
        if (ac.signal.aborted) return;
        setPhase(p);
        onPhaseLabel?.(
          p === 'pipeline'
            ? 'Outreach pipeline'
            : p === 'field-hub'
              ? 'Field outreach hub'
              : p === 'capture-form'
                ? 'Evangelism capture form'
                : p === 'qr-panel'
                  ? 'Team QR & offline sync'
                  : 'Contact saved',
        );

        if (p === 'capture-form') {
          setFirstName('');
          setLastName('');
          setPhone('');
          setPostcode('');
          setLocation('');
          setNeedsBus(false);
          setSaving(false);
          await sleep(reduceMotion ? 100 : 400);
          await typeValue(CAPTURE_DEMO.firstName, setFirstName, !!reduceMotion);
          await sleep(120);
          await typeValue(CAPTURE_DEMO.lastName, setLastName, !!reduceMotion);
          await sleep(120);
          await typeValue(CAPTURE_DEMO.phone, setPhone, !!reduceMotion);
          await sleep(120);
          await typeValue(CAPTURE_DEMO.postcode, setPostcode, !!reduceMotion);
          await sleep(200);
          await typeValue(CAPTURE_DEMO.location, setLocation, !!reduceMotion);
          await sleep(300);
          setNeedsBus(true);
          await sleep(reduceMotion ? 200 : 500);
          setSaving(true);
          await sleep(reduceMotion ? 300 : 700);
          setSaving(false);
        }

        await sleep(reduceMotion ? 800 : PHASE_MS[p]);
      }
    };

    void run();
    return () => {
      ac.abort();
    };
  }, [onPhaseLabel, reduceMotion]);

  return (
    <motion.div
      key={phase}
      className="p-6"
      initial={reduceMotion ? false : { opacity: 0.6, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      data-testid="mock-outreach-capture-flow"
    >
      {phase === 'pipeline' && <PipelineView />}
      {phase === 'field-hub' && <FieldHubView />}
      {phase === 'capture-form' && (
        <CaptureFormView
          firstName={firstName}
          lastName={lastName}
          phone={phone}
          postcode={postcode}
          location={location}
          needsBus={needsBus}
          saving={saving}
        />
      )}
      {phase === 'qr-panel' && <QrPanelView />}
      {phase === 'saved' && <SavedView />}
    </motion.div>
  );
}

/** Total mock evangelism flow duration (ms) — used to extend tour hold on Outreach step. */
export function outreachEvangelismFlowDurationMs(reduceMotion: boolean): number {
  if (reduceMotion) return 5000;
  return Object.values(PHASE_MS).reduce((a, b) => a + b, 0) + 2000;
}
