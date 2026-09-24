import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './AuthProvider';
import { BrandingEffects } from '@/components/BrandingEffects';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Keeps <title>, favicon and share metadata in sync with the DB. */}
      <BrandingEffects />
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
