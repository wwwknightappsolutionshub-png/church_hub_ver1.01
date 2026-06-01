'use client';

import { useCallback, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function useLoungePresence(churchId?: string, memberId?: string) {
  const [onlineMemberIds, setOnlineMemberIds] = useState<string[]>([]);

  useEffect(() => {
    if (!churchId || !memberId) return;

    const socket: Socket = io(`${API_URL}/realtime`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    const heartbeat = () => {
      api.post('/lounge/presence/heartbeat', { memberId }).catch(() => {});
    };

    socket.on('connect', () => {
      socket.emit('join-lounge', { churchId, memberId });
      heartbeat();
    });

    socket.on('lounge:presence', (payload: { onlineMemberIds: string[] }) => {
      setOnlineMemberIds(payload.onlineMemberIds ?? []);
    });

    const interval = setInterval(heartbeat, 25_000);

    return () => {
      clearInterval(interval);
      socket.emit('leave-lounge');
      socket.disconnect();
    };
  }, [churchId, memberId]);

  const isOnline = useCallback(
    (id: string) => onlineMemberIds.includes(id),
    [onlineMemberIds],
  );

  return { onlineMemberIds, isOnline };
}
