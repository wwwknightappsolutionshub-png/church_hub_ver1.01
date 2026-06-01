export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response?: { data?: { message?: string | string[] } } }).response?.data;
    const msg = data?.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg) && msg.length) return msg.join(', ');
  }
  return fallback;
}
