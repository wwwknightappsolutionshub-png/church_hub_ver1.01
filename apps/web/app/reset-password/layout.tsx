/** Always serve fresh auth HTML (avoid stale script chunk hashes behind proxies). */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
