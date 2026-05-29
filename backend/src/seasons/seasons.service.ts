import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SeasonStatus } from '@prisma/client';

@Injectable()
export class SeasonsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string; budgetPerCaptain: number; transferLimit?: number }) {
    return this.prisma.season.create({
      data: {
        name: data.name,
        budgetPerCaptain: data.budgetPerCaptain,
        transferLimit: data.transferLimit ?? 2,
      },
    });
  }

  async findAll() {
    return this.prisma.season.findMany({
      include: { _count: { select: { players: true, captains: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const season = await this.prisma.season.findUnique({
      where: { id },
      include: {
        captains: { include: { user: { select: { name: true, email: true } } } },
        _count: { select: { players: true, teams: true } },
      },
    });
    if (!season) throw new NotFoundException('Season not found');
    return season;
  }

  async findActive() {
    return this.prisma.season.findFirst({
      where: { status: SeasonStatus.ACTIVE },
      include: {
        captains: { include: { user: { select: { name: true, email: true } }, team: true } },
        _count: { select: { players: true } },
      },
    });
  }

  async update(id: string, data: Partial<{ name: string; budgetPerCaptain: number; transferLimit: number }>) {
    await this.findOne(id);
    return this.prisma.season.update({ where: { id }, data });
  }

  async activate(id: string) {
    const season = await this.findOne(id);
    if (season.status === SeasonStatus.ARCHIVED) {
      throw new BadRequestException('Cannot activate an archived season');
    }
    await this.prisma.season.updateMany({
      where: { status: SeasonStatus.ACTIVE },
      data: { status: SeasonStatus.ARCHIVED },
    });
    return this.prisma.season.update({
      where: { id },
      data: { status: SeasonStatus.ACTIVE },
    });
  }

  async archive(id: string) {
    await this.findOne(id);
    return this.prisma.season.update({
      where: { id },
      data: { status: SeasonStatus.ARCHIVED },
    });
  }

  async openTransferWindow(id: string) {
    const season = await this.findOne(id);
    if (season.auctionStatus !== 'COMPLETED') {
      throw new BadRequestException('Auction must be completed before opening transfer window');
    }
    return this.prisma.season.update({
      where: { id },
      data: { transferWindowStatus: 'OPEN' },
    });
  }

  async closeTransferWindow(id: string) {
    return this.prisma.season.update({
      where: { id },
      data: { transferWindowStatus: 'CLOSED' },
    });
  }
}
