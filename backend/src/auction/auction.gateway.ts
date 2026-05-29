import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuctionService } from './auction.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

const BID_TIMER_SECONDS = 10;

@WebSocketGateway({
  namespace: '/auction',
  cors: { origin: '*' },
})
export class AuctionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Timer tracking: seasonId -> { timeout, playerId, endsAt }
  private timers = new Map<
    string,
    { timeout: NodeJS.Timeout; playerId: string; endsAt: number }
  >();

  constructor(
    private auctionService: AuctionService,
    private jwt: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwt.verify(token, {
        secret: this.config.get('JWT_SECRET'),
      });
      (client as any).user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {}

  @SubscribeMessage('auction:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { seasonId: string },
  ) {
    client.join(`season:${data.seasonId}`);
    const state = await this.auctionService.getState(data.seasonId);

    // Include timer info if a timer is running for this season
    const timer = this.timers.get(data.seasonId);
    const timerState = timer
      ? { timerEndsAt: timer.endsAt, timerDuration: BID_TIMER_SECONDS }
      : null;

    client.emit('auction:state', { ...state, ...timerState });
  }

  @SubscribeMessage('auction:leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { seasonId: string },
  ) {
    client.leave(`season:${data.seasonId}`);
  }

  @SubscribeMessage('auction:place-bid')
  async handleBid(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { seasonId: string; playerId: string; amount: number },
  ) {
    const user = (client as any).user;
    if (user.role !== 'CAPTAIN') {
      client.emit('auction:bid-rejected', { message: 'Only captains can bid' });
      return;
    }

    try {
      const captain = await this.prisma.captain.findUnique({
        where: { userId: user.id },
        include: { user: { select: { name: true } } },
      });
      if (!captain) {
        client.emit('auction:bid-rejected', { message: 'Captain not found' });
        return;
      }

      const result = await this.auctionService.placeBid(
        data.seasonId,
        data.playerId,
        captain.id,
        data.amount,
      );

      // Start or reset the 10-second timer
      const endsAt = Date.now() + BID_TIMER_SECONDS * 1000;
      this.startTimer(data.seasonId, data.playerId, BID_TIMER_SECONDS);

      this.server.to(`season:${data.seasonId}`).emit('auction:bid-placed', {
        playerId: data.playerId,
        captainId: captain.id,
        captainName: captain.user.name,
        amount: data.amount,
        highestBid: data.amount,
        timerEndsAt: endsAt,
        timerDuration: BID_TIMER_SECONDS,
      });
    } catch (error: any) {
      client.emit('auction:bid-rejected', { message: error.message });
    }
  }

  /**
   * Start or reset a countdown timer for a player in auction.
   * When the timer expires, the player is auto-closed (sold to highest bidder or unsold).
   */
  private startTimer(seasonId: string, playerId: string, seconds: number) {
    // Clear any existing timer for this season
    this.clearTimer(seasonId);

    const endsAt = Date.now() + seconds * 1000;
    const timeout = setTimeout(async () => {
      try {
        const result = await this.auctionService.closePlayer(seasonId, playerId);
        const state = await this.auctionService.getState(seasonId);

        // Broadcast the result
        this.server.to(`season:${seasonId}`).emit('auction:player-closed', {
          ...result,
          autoClose: true,
        });

        // Broadcast updated state so all clients refresh
        this.server.to(`season:${seasonId}`).emit('auction:state', state);

        this.timers.delete(seasonId);
      } catch (error) {
        console.error('Auto-close timer error:', error);
        this.timers.delete(seasonId);
      }
    }, seconds * 1000);

    this.timers.set(seasonId, { timeout, playerId, endsAt });
  }

  private clearTimer(seasonId: string) {
    const existing = this.timers.get(seasonId);
    if (existing) {
      clearTimeout(existing.timeout);
      this.timers.delete(seasonId);
    }
  }

  /**
   * Called by the controller when admin manually closes bidding via REST.
   * Broadcasts the result to all connected clients.
   */
  async broadcastPlayerClosed(
    seasonId: string,
    result: any,
  ) {
    // Clear any running timer
    this.clearTimer(seasonId);

    // Broadcast close result
    this.server.to(`season:${seasonId}`).emit('auction:player-closed', {
      ...result,
      autoClose: false,
    });

    // Broadcast updated state
    const state = await this.auctionService.getState(seasonId);
    this.server.to(`season:${seasonId}`).emit('auction:state', state);
  }

  /**
   * Called when a new player is opened for bidding via REST.
   * Broadcasts the updated state to all connected clients.
   */
  async broadcastPlayerOpened(seasonId: string) {
    const state = await this.auctionService.getState(seasonId);
    this.server.to(`season:${seasonId}`).emit('auction:state', state);
  }

  /**
   * Get the timer end timestamp for a season (for REST polling clients).
   */
  getTimerEndsAt(seasonId: string): number | null {
    const timer = this.timers.get(seasonId);
    return timer ? timer.endsAt : null;
  }

  /**
   * Called when auction status changes (start/pause/resume/end) via REST.
   */
  async broadcastAuctionStatusChange(seasonId: string) {
    // Clear timers on pause/end
    this.clearTimer(seasonId);
    const state = await this.auctionService.getState(seasonId);
    this.server.to(`season:${seasonId}`).emit('auction:state', state);
  }

  emitToSeason(seasonId: string, event: string, data: any) {
    this.server.to(`season:${seasonId}`).emit(event, data);
  }
}
