'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface BusLocationEvent {
  driverId: string;
  churchId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  recordedAt: string;
}

export function useBusRealtime(churchId?: string) {
  const [locations, setLocations] = useState<BusLocationEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!churchId) return;

    const socket: Socket = io(`${API_URL}/realtime`, { transports: ['websocket'] });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-church', { churchId });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('bus:location', (event: BusLocationEvent) => {
      setLocations((prev) => {
        const filtered = prev.filter((l) => l.driverId !== event.driverId);
        return [event, ...filtered].slice(0, 10);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [churchId]);

  return { locations, connected };
}
