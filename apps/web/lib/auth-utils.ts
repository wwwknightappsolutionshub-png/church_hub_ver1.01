export function getChurchIdFromToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const token = localStorage.getItem('accessToken');
  if (!token) return undefined;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.churchId as string;
  } catch {
    return undefined;
  }
}
