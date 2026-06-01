'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function useServiceUnitPresence(serviceUnitId?: string, memberId?: string) {
  const [onlineMemberIds, setOnlineMemberIds] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!serviceUnitId || !memberId) return;

    const socket: Socket = io(`${API_URL}/realtime`, { transports: ['websocket'] });

    const heartbeat = () => {
      api.post(`/service-units/${serviceUnitId}/presence/heartbeat`, { memberId }).catch(() => {});
    };

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-service-unit', { serviceUnitId, memberId });
      heartbeat();
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('service-unit:presence', (payload: { onlineMemberIds: string[] }) => {
      setOnlineMemberIds(payload.onlineMemberIds ?? []);
    });

    const interval = setInterval(heartbeat, 25_000);

    return () => {
      clearInterval(interval);
      socket.emit('leave-service-unit');
      socket.disconnect();
    };
  }, [serviceUnitId, memberId]);

  const isOnline = (id: string) => onlineMemberIds.includes(id);

  return { onlineMemberIds, connected, isOnline };
}
