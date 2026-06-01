'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/api-errors';
import { LoungeAtriumScene, LOUNGE_HEADER_RATIO } from '@/components/lounge/LoungeAtriumScene';
import { LoungeMemberDetailPanel } from '@/components/lounge/LoungeMemberDetailPanel';
import { LoungeMemberStation } from '@/components/lounge/LoungeMemberStation';
import { LoungeProximityRing } from '@/components/lounge/LoungeProximityRing';
import { LoungeSelfMarker } from '@/components/lounge/LoungeSelfMarker';
import { useLoungePointer } from '@/components/lounge/use-lounge-pointer';
import { memberInitials } from '@/lib/member-initials';

export interface LoungeMember {
  id: string;
  displayName: string;
  membershipStatus?: string;
  profession: string;
  serviceUnits: string[];
  isOnline: boolean;
  isSelf: boolean;
  canConnect: boolean;
}

interface FigureState {
  key: string;
  member: LoungeMember;
  x: number;
  y: number;
}

const FIGURE_H = 72;
const EDGE_X = 40;

const DEMO_MEMBERS: LoungeMember[] = [
  { id: 'demo-1', displayName: 'Sarah Johnson', membershipStatus: 'ACTIVE_MEMBER', profession: 'Worship leader', serviceUnits: ['Choir'], isOnline: true, isSelf: false, canConnect: false },
  { id: 'demo-2', displayName: 'Michael Chen', membershipStatus: 'DISCIPLED', profession: 'Software engineer', serviceUnits: ['Media'], isOnline: false, isSelf: false, canConnect: false },
  { id: 'demo-3', displayName: 'Grace Williams', membershipStatus: 'NEW_MEMBER', profession: 'Hospitality', serviceUnits: ['Ushering'], isOnline: true, isSelf: false, canConnect: false },
  { id: 'demo-4', displayName: 'David Okonkwo', membershipStatus: 'ACTIVE_MEMBER', profession: 'Teacher', serviceUnits: ["Children's Church"], isOnline: false, isSelf: false, canConnect: false },
  { id: 'demo-5', displayName: 'Emma Johnson', membershipStatus: 'NEW_MEMBER', profession: 'Student', serviceUnits: ['Youth'], isOnline: true, isSelf: false, canConnect: false },
  { id: 'demo-6', displayName: 'James Patel', membershipStatus: 'DISCIPLED', profession: 'Accountant', serviceUnits: ['Finance'], isOnline: false, isSelf: false, canConnect: false },
];

export { memberInitials };

function hash01(seed: string, salt: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  h = (h + salt * 982451653) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function layoutFigures(members: LoungeMember[], width: number, height: number): FigureState[] {
  if (members.length === 0) return [];

  const w = Math.max(200, width);
  const h = Math.max(220, height);
  const floorTop = h * LOUNGE_HEADER_RATIO;
  const usableW = w - EDGE_X * 2;
  const usableH = h - floorTop - FIGURE_H - 12;

  const self = members.find((m) => m.isSelf);
  const others = members.filter((m) => !m.isSelf);
  const count = others.length;
  const cols = Math.max(1, Math.ceil(Math.sqrt(count * (usableW / Math.max(usableH, 1)) || 1)));
  const rows = Math.max(1, Math.ceil(count / cols));

  const placed: FigureState[] = others.map((member, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const cellW = usableW / cols;
    const cellH = usableH / rows;
    const jitterX = hash01(member.id, 1) * 0.5 + 0.25;
    const jitterY = hash01(member.id, 2) * 0.45 + 0.28;
    const x = EDGE_X + col * cellW + jitterX * cellW;
    const y = floorTop + row * cellH + jitterY * cellH;

    return {
      key: `figure-${member.id}`,
      member,
      x: Math.min(w - EDGE_X, Math.max(EDGE_X, x)),
      y: Math.min(h - FIGURE_H - 10, Math.max(floorTop + 8, y)),
    };
  });

  if (self) {
    placed.push({
      key: `figure-${self.id}`,
      member: self,
      x: w * 0.5,
      y: Math.min(h - FIGURE_H - 16, floorTop + usableH * 0.82),
    });
  }

  return placed;
}

interface LoungeCanvasProps {
  members: LoungeMember[];
  onPresenceRefresh?: () => void;
  className?: string;
}

export function LoungeCanvas({ members, onPresenceRefresh, className }: LoungeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [figures, setFigures] = useState<FigureState[]>([]);
  const [usingDemo, setUsingDemo] = useState(false);
  const [nearMemberId, setNearMemberId] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [floorSize, setFloorSize] = useState({ w: 320, h: 400 });

  const roster = useMemo(() => {
    const self = members.find((m) => m.isSelf);
    const others = members.filter((m) => !m.isSelf);
    if (others.length > 0) return self ? [self, ...others] : others;
    if (self) return [self, ...DEMO_MEMBERS.slice(0, 5)];
    return DEMO_MEMBERS;
  }, [members]);

  const memberIdsKey = useMemo(() => roster.map((m) => `${m.id}:${m.isOnline}`).join('|'), [roster]);

  const otherFigures = useMemo(() => figures.filter((f) => !f.member.isSelf), [figures]);
  const selfFigure = useMemo(() => figures.find((f) => f.member.isSelf) ?? null, [figures]);
  const nearFigure = useMemo(
    () => (nearMemberId ? otherFigures.find((f) => f.member.id === nearMemberId) ?? null : null),
    [nearMemberId, otherFigures],
  );
  const nearMember = nearFigure?.member ?? null;

  const floorTop = floorSize.h * LOUNGE_HEADER_RATIO;

  const othersNear = useMemo(
    () => otherFigures.map((f) => ({ id: f.member.id, x: f.x, y: f.y })),
    [otherFigures],
  );

  const { markerRef, setHome, moveToClient } = useLoungePointer({
    floorTop,
    edgeX: EDGE_X,
    figureH: FIGURE_H,
    others: othersNear,
    enabled: !!selfFigure && figures.length > 0,
    onNearChange: setNearMemberId,
  });

  useEffect(() => {
    setUsingDemo(members.filter((m) => !m.isSelf).length === 0);
  }, [members]);

  const layout = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth || 320;
    const h = Math.max(280, el.clientHeight || 280);
    setFloorSize({ w, h });
    const laid = layoutFigures(roster, w, h);
    setFigures(laid);
    const home = laid.find((f) => f.member.isSelf);
    if (home) setHome(home.x, home.y);
  }, [memberIdsKey, roster, setHome]);

  useEffect(() => {
    layout();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => layout());
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout]);

  useEffect(() => {
    setFigures((prev) =>
      prev.map((f) => {
        const updated = roster.find((m) => m.id === f.member.id);
        return updated ? { ...f, member: updated } : f;
      }),
    );
  }, [roster]);

  const connect = async (member: LoungeMember) => {
    if (member.isSelf) return;
    if (member.id.startsWith('demo-')) {
      toast.message('Preview member — add church members or sign in as another user to connect.');
      return;
    }
    if (!member.canConnect) {
      toast.error('This member cannot receive messages yet');
      return;
    }
    setConnectingId(member.id);
    await new Promise((r) => setTimeout(r, 650));
    try {
      await api.post(`/lounge/connect/${member.id}`);
      toast.success('Friendship request sent');
      onPresenceRefresh?.();
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, 'Could not send request'));
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <div
      className={cn(
        'relative flex w-full min-h-[min(58dvh,520px)] flex-col',
        className,
      )}
    >
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-3 rounded-lg border border-border/80 bg-card/50 px-3 py-2.5 text-xs">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <Users className="h-3.5 w-3.5 text-slate-500" />
          {roster.length} in lounge
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="lounge-presence-green h-2 w-2 rounded-full" />
          Available
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="lounge-presence-orange h-2 w-2 rounded-full" />
          Unavailable
        </span>
        <span className="text-[11px] text-muted-foreground sm:ml-auto">
          Move your marker on the plaza · profile shows in the briefing panel above
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative min-h-0 w-full flex-1 touch-none overflow-hidden rounded-xl border border-slate-300/70 shadow-sm"
        onPointerMove={(e) => {
          if (containerRef.current) moveToClient(e.clientX, e.clientY, containerRef.current);
        }}
        onPointerDown={(e) => {
          if (!selfFigure || !containerRef.current) return;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          moveToClient(e.clientX, e.clientY, containerRef.current);
        }}
      >
        <LoungeAtriumScene />
        <LoungeMemberDetailPanel member={nearMember} connecting={!!connectingId} />

        {nearFigure && <LoungeProximityRing x={nearFigure.x} y={nearFigure.y} />}

        {otherFigures.map((f) => (
          <div key={f.key} className="absolute" style={{ left: f.x, top: f.y }}>
            <LoungeMemberStation
              member={f.member}
              selected={nearMemberId === f.member.id}
              onSelect={() => connect(f.member)}
            />
          </div>
        ))}

        {selfFigure && (
          <div ref={markerRef}>
            <LoungeSelfMarker
              member={selfFigure.member}
              motion={connectingId ? 'handshake' : 'static'}
              connecting={!!connectingId}
              near={!!nearMemberId}
            />
          </div>
        )}

        {figures.length === 0 && (
          <div className="relative z-10 flex h-full min-h-[280px] items-center justify-center text-sm text-slate-500">
            Loading lounge floor…
          </div>
        )}

      </div>
    </div>
  );
}
