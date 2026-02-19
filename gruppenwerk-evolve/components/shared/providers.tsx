'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';

interface ProvidersProps {
  children: React.ReactNode;
}

// Globale Provider: TanStack Query und Toast-Benachrichtigungen
export function Providers({ children }: ProvidersProps): React.ReactNode {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          duration: 3000,
        }}
      />
    </QueryClientProvider>
  );
}
