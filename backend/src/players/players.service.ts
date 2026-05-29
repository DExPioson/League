import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlayerStatus } from '@prisma/client';

@Injectable()
export class PlayersService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    seasonId: string;
    name: string;
    position: string;
    basePrice: number;
    age?: number;
    preferredFoot?: string;
    rating?: number;
    photo?: string;
    notes?: string;
  }) {
    return this.prisma.player.create({ data });
  }

  async findAll(filters?: {
    seasonId?: string;
    status?: PlayerStatus;
    position?: string;
    search?: string;
  }) {
    const where: any = {};
    if (filters?.seasonId) where.seasonId = filters.seasonId;
    if (filters?.status) where.status = filters.status;
    if (filters?.position) where.position = filters.position;
    if (filters?.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }

    return this.prisma.player.findMany({
      where,
      include: {
        currentTeam: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const player = await this.prisma.player.findUnique({
      where: { id },
      include: {
        currentTeam: { include: { captain: { include: { user: { select: { name: true } } } } } },
        bids: { orderBy: { amount: 'desc' }, take: 10 },
      },
    });
    if (!player) throw new NotFoundException('Player not found');
    return player;
  }

  async update(id: string, data: Partial<{
    name: string;
    position: string;
    basePrice: number;
    age: number;
    preferredFoot: string;
    rating: number;
    photo: string;
    notes: string;
    status: PlayerStatus;
  }>) {
    await this.findOne(id);
    return this.prisma.player.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.player.delete({ where: { id } });
  }

  async importPlayers(seasonId: string, players: Array<{
    name: string;
    position: string;
    basePrice: number;
    age?: number;
    preferredFoot?: string;
    rating?: number;
  }>) {
    return this.prisma.player.createMany({
      data: players.map((p) => ({ ...p, seasonId })),
    });
  }
}
