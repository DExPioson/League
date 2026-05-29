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

@WebSocketGateway({
  namespace: '/auction',
  cors: { origin: '*' },
})
export class AuctionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

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
    client.emit('auction:state', state);
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

      this.server.to(`season:${data.seasonId}`).emit('auction:bid-placed', {
        playerId: data.playerId,
        captainId: captain.id,
        captainName: captain.user.name,
        amount: data.amount,
        highestBid: data.amount,
      });
    } catch (error: any) {
      client.emit('auction:bid-rejected', { message: error.message });
    }
  }

  emitToSeason(seasonId: string, event: string, data: any) {
    this.server.to(`season:${seasonId}`).emit(event, data);
  }
}
