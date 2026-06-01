/** Motion for lounge avatars — others stay static; only the viewer animates when connecting. */
export type LoungeMotionMode = 'static' | 'approach' | 'handshake';

export function loungeApproachPosition(
  self: { x: number; y: number },
  target: { x: number; y: number },
  phase: 'approach' | 'handshake',
): { x: number; y: number } {
  const dx = target.x - self.x;
  const dy = target.y - self.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return { x: self.x, y: self.y };

  const ratio = phase === 'handshake' ? 0.78 : 0.52;
  const cap = phase === 'handshake' ? 58 : 50;
  const step = Math.min(dist * ratio, cap);

  return {
    x: self.x + (dx / dist) * step,
    y: self.y + (dy / dist) * step,
  };
}
