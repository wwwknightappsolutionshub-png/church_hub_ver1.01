'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { YouthChatMessage, YouthDirectMessage } from '@church-hub/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function getUserIdFromToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const token = localStorage.getItem('accessToken');
  if (!token) return undefined;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub ?? payload.userId ?? payload.id;
  } catch {
    return undefined;
  }
}

export function useYouthChatRealtime(opts: {
  channelId?: string;
  dmThreadKey?: string;
  onChannelMessage?: (msg: YouthChatMessage) => void;
  onDm?: (msg: YouthDirectMessage) => void;
  onReaction?: (payload: Record<string, unknown>) => void;
}) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const userId = getUserIdFromToken();

  const emitTyping = useCallback(
    (displayName: string) => {
      socketRef.current?.emit('youth-typing', {
        channelId: opts.channelId,
        threadKey: opts.dmThreadKey,
        userId,
        displayName,
      });
    },
    [opts.channelId, opts.dmThreadKey, userId],
  );

  useEffect(() => {
    const socket = io(`${API_URL}/realtime`, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('youth:message', (msg: YouthChatMessage) => {
      opts.onChannelMessage?.(msg);
    });
    socket.on('youth:dm', (msg: YouthDirectMessage) => {
      opts.onDm?.(msg);
    });
    socket.on('youth:reaction', (payload: Record<string, unknown>) => {
      opts.onReaction?.(payload);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    if (opts.channelId) {
      socket.emit('join-youth-channel', { channelId: opts.channelId });
      return () => {
        socket.emit('leave-youth-channel', { channelId: opts.channelId });
      };
    }
  }, [opts.channelId, connected]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected || !opts.dmThreadKey) return;
    socket.emit('join-youth-dm', { threadKey: opts.dmThreadKey });
  }, [opts.dmThreadKey, connected]);

  return { connected, emitTyping, userId };
}
