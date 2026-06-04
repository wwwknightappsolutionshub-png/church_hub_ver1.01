/** Always serve fresh login HTML (avoid stale script chunk hashes behind proxies). */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
