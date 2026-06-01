/** Fields compared when reconciling offline outreach captures. */
export const OUTREACH_CAPTURE_COMPARE_FIELDS = [
  'firstName',
  'lastName',
  'phone',
  'email',
  'notes',
  'evangelistId',
  'latitude',
  'longitude',
  'locationLabel',
] as const;

export type OutreachCapturePayload = Record<string, unknown>;

export function normalizeCaptureField(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  return String(value).trim().toLowerCase();
}

export function captureFingerprint(payload: OutreachCapturePayload): string {
  const parts = OUTREACH_CAPTURE_COMPARE_FIELDS.map((key) => {
    const raw = payload[key];
    return `${key}=${normalizeCaptureField(raw)}`;
  });
  return parts.join('|');
}

export function outreachPayloadsConflict(
  server: OutreachCapturePayload,
  client: OutreachCapturePayload,
): boolean {
  return captureFingerprint(server) !== captureFingerprint(client);
}

export function mergeCapturePayloads(
  server: OutreachCapturePayload,
  client: OutreachCapturePayload,
): OutreachCapturePayload {
  const merged: OutreachCapturePayload = { ...server };
  for (const key of OUTREACH_CAPTURE_COMPARE_FIELDS) {
    const clientVal = client[key];
    const serverVal = server[key];
    if (normalizeCaptureField(clientVal) && normalizeCaptureField(clientVal) !== normalizeCaptureField(serverVal)) {
      merged[key] = clientVal;
    }
  }
  if (client.notes && normalizeCaptureField(client.notes) !== normalizeCaptureField(server.notes)) {
    merged.notes = [server.notes, client.notes].filter(Boolean).join(' | ');
  }
  return merged;
}
