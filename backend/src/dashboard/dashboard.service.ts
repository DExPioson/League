import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getAdminDashboard(seasonId: string) {
    const [totalPlayers, soldPlayers, unsoldPlayers, pendingTransfers, captains] =
      await Promise.all([
        this.prisma.player.count({ where: { seasonId } }),
        this.prisma.player.count({ where: { seasonId, status: 'SOLD' } }),
        this.prisma.player.count({ where: { seasonId, status: 'UNSOLD' } }),
        this.prisma.transferRequest.count({
          where: { seasonId, status: { in: ['PENDING', 'ACCEPTED'] } },
        }),
        this.prisma.captain.findMany({
          where: { seasonId },
          include: {
            user: { select: { name: true } },
            team: { include: { _count: { select: { players: true } } } },
          },
        }),
      ]);

    const totalSpent = captains.reduce((sum, c) => sum + c.spentAmount, 0);

    return {
      totalPlayers,
      soldPlayers,
      unsoldPlayers,
      totalSpent,
      pendingTransfers,
      captains: captains.map((c) => ({
        captainId: c.id,
        name: c.user.name,
        teamName: c.team?.name,
        spent: c.spentAmount,
        remaining: c.remainingBudget,
        players: c.team?._count?.players ?? 0,
      })),
    };
  }

  async getCaptainDashboard(seasonId: string, userId: string) {
    const captain = await this.prisma.captain.findUnique({
      where: { userId },
      include: {
        team: { include: { players: { orderBy: { name: 'asc' } } } },
        season: true,
      },
    });

    if (!captain) return null;

    const [incomingTransfers, outgoingTransfers] = await Promise.all([
      this.prisma.transferRequest.count({
        where: { toCaptainId: captain.id, status: 'PENDING' },
      }),
      this.prisma.transferRequest.count({
        where: { fromCaptainId: captain.id, status: { in: ['PENDING', 'ACCEPTED'] } },
      }),
    ]);

    return {
      remainingBudget: captain.remainingBudget,
      totalSpent: captain.spentAmount,
      squadSize: captain.team?.players?.length ?? 0,
      transfersUsed: captain.transfersUsed,
      transfersRemaining: captain.season.transferLimit - captain.transfersUsed,
      team: captain.team,
      players: captain.team?.players ?? [],
      incomingTransfers,
      outgoingTransfers,
    };
  }

  async getPlayerDashboard(seasonId: string, userId: string) {
    const player = await this.prisma.player.findFirst({
      where: { userId, seasonId },
      include: {
        currentTeam: {
          include: {
            captain: { include: { user: { select: { name: true } } } },
          },
        },
        season: { select: { name: true, status: true } },
      },
    });

    return player;
  }
}
