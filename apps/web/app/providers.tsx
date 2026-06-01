'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';
import { AppErrorBoundary } from '@/components/app/AppErrorBoundary';
import { ChurchPwaRegister } from '@/components/church-landing/ChurchPwaRegister';
import { attachAuthRefreshInterceptor } from '@/lib/auth-refresh';

let refreshAttached = false;

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!refreshAttached) {
      attachAuthRefreshInterceptor();
      refreshAttached = true;
    }
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 10 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AppErrorBoundary>
          <ChurchPwaRegister />
          {children}
        </AppErrorBoundary>
        <Toaster
          richColors
          position="top-center"
          closeButton
          expand
          visibleToasts={4}
          offset="calc(3.5rem + env(safe-area-inset-top))"
          toastOptions={{ duration: 5000 }}
          style={{ zIndex: 9999 }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
