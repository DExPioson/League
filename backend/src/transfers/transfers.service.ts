import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransferStatus } from '@prisma/client';

@Injectable()
export class TransfersService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    seasonId: string;
    playerId: string;
    fromCaptainId: string;
    toCaptainId: string;
    requestedById: string;
    reason?: string;
  }) {
    const season = await this.prisma.season.findUnique({ where: { id: data.seasonId } });
    if (!season) throw new NotFoundException('Season not found');
    if (season.transferWindowStatus !== 'OPEN') {
      throw new BadRequestException('Transfer window is not open');
    }

    const fromCaptain = await this.prisma.captain.findUnique({ where: { id: data.fromCaptainId } });
    const toCaptain = await this.prisma.captain.findUnique({ where: { id: data.toCaptainId } });
    if (!fromCaptain || !toCaptain) throw new NotFoundException('Captain not found');

    if (fromCaptain.transfersUsed >= season.transferLimit) {
      throw new BadRequestException('Transfer limit exceeded for sending captain');
    }
    if (toCaptain.transfersUsed >= season.transferLimit) {
      throw new BadRequestException('Transfer limit exceeded for receiving captain');
    }

    const player = await this.prisma.player.findUnique({ where: { id: data.playerId } });
    if (!player) throw new NotFoundException('Player not found');
    if (player.currentTeamId !== fromCaptain.teamId) {
      throw new BadRequestException('Player does not belong to the sending team');
    }

    const pendingTransfer = await this.prisma.transferRequest.findFirst({
      where: {
        playerId: data.playerId,
        status: { in: [TransferStatus.PENDING, TransferStatus.ACCEPTED] },
      },
    });
    if (pendingTransfer) {
      throw new BadRequestException('Player already has an active transfer request');
    }

    return this.prisma.transferRequest.create({ data });
  }

  async findAll(filters?: { seasonId?: string; status?: TransferStatus; captainId?: string }) {
    const where: any = {};
    if (filters?.seasonId) where.seasonId = filters.seasonId;
    if (filters?.status) where.status = filters.status;
    if (filters?.captainId) {
      where.OR = [
        { fromCaptainId: filters.captainId },
        { toCaptainId: filters.captainId },
      ];
    }
    return this.prisma.transferRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async accept(id: string, captainId: string) {
    const transfer = await this.prisma.transferRequest.findUnique({ where: { id } });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status !== 'PENDING') throw new BadRequestException('Transfer is not pending');
    if (transfer.toCaptainId !== captainId) {
      throw new BadRequestException('Only the receiving captain can accept');
    }
    return this.prisma.transferRequest.update({
      where: { id },
      data: { status: TransferStatus.ACCEPTED },
    });
  }

  async reject(id: string, captainId: string) {
    const transfer = await this.prisma.transferRequest.findUnique({ where: { id } });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status !== 'PENDING') throw new BadRequestException('Transfer is not pending');
    if (transfer.toCaptainId !== captainId) {
      throw new BadRequestException('Only the receiving captain can reject');
    }
    return this.prisma.transferRequest.update({
      where: { id },
      data: { status: TransferStatus.REJECTED },
    });
  }

  async approve(id: string) {
    const transfer = await this.prisma.transferRequest.findUnique({ where: { id } });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status !== 'ACCEPTED') {
      throw new BadRequestException('Transfer must be accepted before admin approval');
    }

    return this.prisma.$transaction(async (tx) => {
      const fromCaptain = await tx.captain.findUnique({ where: { id: transfer.fromCaptainId } });
      const toCaptain = await tx.captain.findUnique({ where: { id: transfer.toCaptainId } });
      if (!fromCaptain || !toCaptain) throw new NotFoundException('Captain not found');

      const season = await tx.season.findUnique({ where: { id: transfer.seasonId } });
      if (fromCaptain.transfersUsed >= season!.transferLimit) {
        throw new BadRequestException('Transfer limit exceeded');
      }
      if (toCaptain.transfersUsed >= season!.transferLimit) {
        throw new BadRequestException('Transfer limit exceeded');
      }

      await tx.player.update({
        where: { id: transfer.playerId },
        data: {
          currentTeamId: toCaptain.teamId,
          status: 'TRANSFERRED',
        },
      });

      await tx.captain.update({
        where: { id: transfer.fromCaptainId },
        data: { transfersUsed: { increment: 1 } },
      });

      await tx.captain.update({
        where: { id: transfer.toCaptainId },
        data: { transfersUsed: { increment: 1 } },
      });

      await tx.transferRequest.update({
        where: { id },
        data: { status: TransferStatus.COMPLETED },
      });

      await tx.transferHistory.create({
        data: {
          transferId: id,
          playerId: transfer.playerId,
          fromCaptainId: transfer.fromCaptainId,
          toCaptainId: transfer.toCaptainId,
        },
      });

      return { success: true, status: 'COMPLETED' };
    });
  }

  async cancel(id: string) {
    const transfer = await this.prisma.transferRequest.findUnique({ where: { id } });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (!['PENDING', 'ACCEPTED'].includes(transfer.status)) {
      throw new BadRequestException('Transfer cannot be cancelled');
    }
    return this.prisma.transferRequest.update({
      where: { id },
      data: { status: TransferStatus.CANCELLED },
    });
  }

  async getHistory(seasonId: string) {
    return this.prisma.transferHistory.findMany({
      where: { id: seasonId },
      orderBy: { completedAt: 'desc' },
    });
  }
}
