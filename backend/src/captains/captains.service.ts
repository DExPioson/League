import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CaptainsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { userId: string; teamName: string; seasonId: string }) {
    const season = await this.prisma.season.findUnique({ where: { id: data.seasonId } });
    if (!season) throw new NotFoundException('Season not found');

    const existingCaptains = await this.prisma.captain.count({
      where: { seasonId: data.seasonId },
    });
    if (existingCaptains >= 3) {
      throw new BadRequestException('Maximum 3 captains per season');
    }

    const existingUser = await this.prisma.captain.findUnique({
      where: { userId: data.userId },
    });
    if (existingUser) throw new BadRequestException('User is already a captain');

    return this.prisma.$transaction(async (tx) => {
      const captain = await tx.captain.create({
        data: {
          userId: data.userId,
          seasonId: data.seasonId,
          startingBudget: season.budgetPerCaptain,
          remainingBudget: season.budgetPerCaptain,
        },
      });

      const team = await tx.team.create({
        data: {
          seasonId: data.seasonId,
          captainId: captain.id,
          name: data.teamName,
        },
      });

      await tx.captain.update({
        where: { id: captain.id },
        data: { teamId: team.id },
      });

      await tx.user.update({
        where: { id: data.userId },
        data: { role: 'CAPTAIN' },
      });

      return { ...captain, teamId: team.id, team };
    });
  }

  async findAll(seasonId?: string) {
    const where: any = {};
    if (seasonId) where.seasonId = seasonId;

    return this.prisma.captain.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        team: { include: { _count: { select: { players: true } } } },
      },
    });
  }

  async findOne(id: string) {
    const captain = await this.prisma.captain.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        team: { include: { players: true } },
      },
    });
    if (!captain) throw new NotFoundException('Captain not found');
    return captain;
  }

  async getTeam(id: string) {
    const captain = await this.prisma.captain.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            players: { orderBy: { name: 'asc' } },
          },
        },
      },
    });
    if (!captain) throw new NotFoundException('Captain not found');
    return captain.team;
  }

  async getBudget(id: string) {
    const captain = await this.prisma.captain.findUnique({
      where: { id },
      select: {
        id: true,
        startingBudget: true,
        spentAmount: true,
        remainingBudget: true,
      },
    });
    if (!captain) throw new NotFoundException('Captain not found');
    return captain;
  }

  async findByUserId(userId: string) {
    return this.prisma.captain.findUnique({
      where: { userId },
      include: {
        team: true,
        season: true,
      },
    });
  }
}
