import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

export interface BusLocationEvent {
  driverId: string;
  churchId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  recordedAt: string;
}

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/realtime' })
export class RealtimeGateway implements OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);
  /** serviceUnitId → Set of memberIds currently online */
  private readonly onlineByUnit = new Map<string, Set<string>>();
  /** churchId → Set of memberIds in the Lounge */
  private readonly onlineByChurch = new Map<string, Set<string>>();
  /** socketId → { serviceUnitId, memberId } */
  private readonly socketPresence = new Map<string, { serviceUnitId: string; memberId: string }>();
  /** socketId → { churchId, memberId } */
  private readonly socketLoungePresence = new Map<string, { churchId: string; memberId: string }>();

  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('join-church')
  handleJoinChurch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { churchId: string },
  ) {
    client.join(`church:${data.churchId}`);
    this.logger.debug(`Client ${client.id} joined church:${data.churchId}`);
    return { joined: true };
  }

  @SubscribeMessage('join-driver')
  handleJoinDriver(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { driverId: string },
  ) {
    client.join(`driver:${data.driverId}`);
    return { joined: true };
  }

  @SubscribeMessage('join-service-unit')
  handleJoinServiceUnit(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { serviceUnitId: string; memberId: string },
  ) {
    const room = `service-unit:${data.serviceUnitId}`;
    client.join(room);

    const prev = this.socketPresence.get(client.id);
    if (prev) this.removeFromOnline(prev.serviceUnitId, prev.memberId);

    this.socketPresence.set(client.id, {
      serviceUnitId: data.serviceUnitId,
      memberId: data.memberId,
    });
    this.addToOnline(data.serviceUnitId, data.memberId);
    this.emitPresence(data.serviceUnitId);
    return { joined: true, onlineMemberIds: this.getOnlineMembers(data.serviceUnitId) };
  }

  @SubscribeMessage('leave-service-unit')
  handleLeaveServiceUnit(@ConnectedSocket() client: Socket) {
    this.clearSocketPresence(client.id);
    return { left: true };
  }

  handleDisconnect(client: Socket) {
    this.clearSocketPresence(client.id);
    this.clearSocketLoungePresence(client.id);
  }

  @SubscribeMessage('join-lounge')
  handleJoinLounge(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { churchId: string; memberId: string },
  ) {
    const room = `lounge:${data.churchId}`;
    client.join(room);

    const prev = this.socketLoungePresence.get(client.id);
    if (prev) this.removeFromLoungeOnline(prev.churchId, prev.memberId);

    this.socketLoungePresence.set(client.id, {
      churchId: data.churchId,
      memberId: data.memberId,
    });
    this.addToLoungeOnline(data.churchId, data.memberId);
    this.emitLoungePresence(data.churchId);
    return { joined: true, onlineMemberIds: this.getLoungeOnlineMembers(data.churchId) };
  }

  @SubscribeMessage('leave-lounge')
  handleLeaveLounge(@ConnectedSocket() client: Socket) {
    this.clearSocketLoungePresence(client.id);
    return { left: true };
  }

  setLoungeMemberOnline(churchId: string, memberId: string) {
    this.addToLoungeOnline(churchId, memberId);
    this.emitLoungePresence(churchId);
  }

  setLoungeMemberOffline(churchId: string, memberId: string) {
    this.removeFromLoungeOnline(churchId, memberId);
    this.emitLoungePresence(churchId);
  }

  getLoungeOnlineMembers(churchId: string): string[] {
    return Array.from(this.onlineByChurch.get(churchId) ?? []);
  }

  setMemberOnline(serviceUnitId: string, memberId: string) {
    this.addToOnline(serviceUnitId, memberId);
    this.emitPresence(serviceUnitId);
  }

  setMemberOffline(serviceUnitId: string, memberId: string) {
    this.removeFromOnline(serviceUnitId, memberId);
    this.emitPresence(serviceUnitId);
  }

  getOnlineMembers(serviceUnitId: string): string[] {
    return Array.from(this.onlineByUnit.get(serviceUnitId) ?? []);
  }

  emitBusLocation(event: BusLocationEvent) {
    this.server.to(`church:${event.churchId}`).emit('bus:location', event);
    this.server.to(`driver:${event.driverId}`).emit('bus:location', event);
  }

  emitEmergency(churchId: string, payload: Record<string, unknown>) {
    this.server.to(`church:${churchId}`).emit('bus:emergency', payload);
  }

  // ─── Youth chat (Phase 4) ───────────────────────────────────

  @SubscribeMessage('join-youth-channel')
  handleJoinYouthChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const room = `youth-channel:${data.channelId}`;
    client.join(room);
    this.logger.debug(`Client ${client.id} joined ${room}`);
    return { joined: true, channelId: data.channelId };
  }

  @SubscribeMessage('leave-youth-channel')
  handleLeaveYouthChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    client.leave(`youth-channel:${data.channelId}`);
    return { left: true };
  }

  @SubscribeMessage('join-youth-dm')
  handleJoinYouthDm(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadKey: string },
  ) {
    const room = `youth-dm:${data.threadKey}`;
    client.join(room);
    return { joined: true };
  }

  @SubscribeMessage('youth-typing')
  handleYouthTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId?: string; threadKey?: string; userId: string; displayName: string },
  ) {
    const room = data.channelId
      ? `youth-channel:${data.channelId}`
      : data.threadKey
        ? `youth-dm:${data.threadKey}`
        : null;
    if (!room) return;
    client.to(room).emit('youth:typing', data);
  }

  emitYouthChannelMessage(channelId: string, payload: Record<string, unknown>) {
    this.server.to(`youth-channel:${channelId}`).emit('youth:message', payload);
  }

  emitYouthDm(threadKey: string, payload: Record<string, unknown>) {
    this.server.to(`youth-dm:${threadKey}`).emit('youth:dm', payload);
  }

  emitYouthMessageReaction(channelId: string, payload: Record<string, unknown>) {
    this.server.to(`youth-channel:${channelId}`).emit('youth:reaction', payload);
  }

  emitYouthMessageRead(channelId: string, payload: Record<string, unknown>) {
    this.server.to(`youth-channel:${channelId}`).emit('youth:read', payload);
  }

  private addToOnline(serviceUnitId: string, memberId: string) {
    if (!this.onlineByUnit.has(serviceUnitId)) {
      this.onlineByUnit.set(serviceUnitId, new Set());
    }
    this.onlineByUnit.get(serviceUnitId)!.add(memberId);
  }

  private removeFromOnline(serviceUnitId: string, memberId: string) {
    const set = this.onlineByUnit.get(serviceUnitId);
    if (!set) return;
    set.delete(memberId);
    if (set.size === 0) this.onlineByUnit.delete(serviceUnitId);
  }

  private clearSocketPresence(socketId: string) {
    const prev = this.socketPresence.get(socketId);
    if (!prev) return;
    this.removeFromOnline(prev.serviceUnitId, prev.memberId);
    this.emitPresence(prev.serviceUnitId);
    this.socketPresence.delete(socketId);
  }

  private emitPresence(serviceUnitId: string) {
    const onlineMemberIds = this.getOnlineMembers(serviceUnitId);
    this.server.to(`service-unit:${serviceUnitId}`).emit('service-unit:presence', {
      serviceUnitId,
      onlineMemberIds,
    });
  }

  private addToLoungeOnline(churchId: string, memberId: string) {
    if (!this.onlineByChurch.has(churchId)) {
      this.onlineByChurch.set(churchId, new Set());
    }
    this.onlineByChurch.get(churchId)!.add(memberId);
  }

  private removeFromLoungeOnline(churchId: string, memberId: string) {
    const set = this.onlineByChurch.get(churchId);
    if (!set) return;
    set.delete(memberId);
    if (set.size === 0) this.onlineByChurch.delete(churchId);
  }

  private clearSocketLoungePresence(socketId: string) {
    const prev = this.socketLoungePresence.get(socketId);
    if (!prev) return;
    this.removeFromLoungeOnline(prev.churchId, prev.memberId);
    this.emitLoungePresence(prev.churchId);
    this.socketLoungePresence.delete(socketId);
  }

  private emitLoungePresence(churchId: string) {
    const onlineMemberIds = this.getLoungeOnlineMembers(churchId);
    this.server.to(`lounge:${churchId}`).emit('lounge:presence', {
      churchId,
      onlineMemberIds,
    });
  }
}
