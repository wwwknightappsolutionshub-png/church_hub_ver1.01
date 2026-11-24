/** Client helpers for member field privacy markers returned by the API. */

export type RestrictedMarker = {
  restricted: true;
  label: string;
};

export function isRestrictedMarker(value: unknown): value is RestrictedMarker {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as { restricted?: boolean }).restricted === true
  );
}

/** Display string for contact/PII fields that may be masked. */
export function displayPrivacyValue(value: unknown, empty = '—'): string {
  if (value == null || value === '') return empty;
  if (isRestrictedMarker(value)) return value.label || 'Restricted';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return empty;
}
