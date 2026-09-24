import { useQuery } from '@tanstack/react-query';
import { callFunction } from '@/lib/api';
import { DEVELOPER, DEVELOPER_URL } from '@/lib/developer';

interface DeveloperStatus {
  url: string;
  reachable: boolean;
  checkedAt: string;
}

/**
 * Resolves which developer URL the footer should link to.
 *
 * The credit is rendered instantly from `DEVELOPER_URL` (the primary URL) and is
 * only *upgraded* once this non-blocking check answers: if `ravidey.com` does not
 * answer with the expected content, the link switches to the fallback URL.
 *
 * Failures are silent by design — an unreachable function (e.g. plain
 * `npm run dev` without `netlify dev`) simply keeps the primary URL.
 */
export function useDeveloperUrl(): string {
  const { data } = useQuery({
    queryKey: ['developer-url'],
    staleTime: DEVELOPER.cacheTtlMs,
    retry: false,
    // Never block first paint on a domain probe.
    refetchOnWindowFocus: false,
    queryFn: () => callFunction<DeveloperStatus>('developer-status', {}),
  });

  return data?.url ?? DEVELOPER_URL;
}
