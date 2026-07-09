'use client';

import { useQuery } from '@tanstack/react-query';
import { getBadgeData, type BadgeData } from '@/lib/actions/badges';

/**
 * Live badge/overlay data (unread notifications, pending reviews, recent items).
 * Polled every 15s — no realtime/WebSockets yet (V5.1 decision). Shared queryKey
 * so the bell and the My Work nav badge dedupe to one request.
 */
export function useBadgeData() {
  return useQuery<BadgeData>({
    queryKey: ['badge-data'],
    queryFn: () => getBadgeData(),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}
