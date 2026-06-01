export function getEmailFromToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const token = localStorage.getItem('accessToken');
  if (!token) return undefined;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.email as string;
  } catch {
    return undefined;
  }
}

export function formatMemberName(m: { firstName: string; lastName: string }) {
  return `${m.firstName} ${m.lastName}`;
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
