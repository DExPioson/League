import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuctionStatus, PlayerStatus } from '@prisma/client';

@Injectable()
export class AuctionService {
  constructor(private prisma: PrismaService) {}

  async startAuction(seasonId: string) {
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
      include: { _count: { select: { captains: true, players: true } } },
    });
    if (!season) throw new NotFoundException('Season not found');
    if (season.status !== 'ACTIVE') throw new BadRequestException('Season must be active');
    if (season._count.captains < 3) throw new BadRequestException('Need 3 captains to start auction');
    if (season._count.players === 0) throw new BadRequestException('No players available');

    const auction = await this.prisma.auction.create({
      data: {
        seasonId,
        status: AuctionStatus.LIVE,
        startedAt: new Date(),
      },
    });

    await this.prisma.season.update({
      where: { id: seasonId },
      data: { auctionStatus: AuctionStatus.LIVE },
    });

    return auction;
  }

  async pauseAuction(seasonId: string) {
    await this.prisma.season.update({
      where: { id: seasonId },
      data: { auctionStatus: AuctionStatus.PAUSED },
    });
    const auction = await this.getActiveAuction(seasonId);
    if (auction) {
      await this.prisma.auction.update({
        where: { id: auction.id },
        data: { status: AuctionStatus.PAUSED },
      });
    }
    return { success: true };
  }

  async resumeAuction(seasonId: string) {
    await this.prisma.season.update({
      where: { id: seasonId },
      data: { auctionStatus: AuctionStatus.LIVE },
    });
    const auction = await this.getActiveAuction(seasonId);
    if (auction) {
      await this.prisma.auction.update({
        where: { id: auction.id },
        data: { status: AuctionStatus.LIVE },
      });
    }
    return { success: true };
  }

  async endAuction(seasonId: string) {
    await this.prisma.season.update({
      where: { id: seasonId },
      data: { auctionStatus: AuctionStatus.COMPLETED },
    });
    const auction = await this.getActiveAuction(seasonId);
    if (auction) {
      await this.prisma.auction.update({
        where: { id: auction.id },
        data: { status: AuctionStatus.COMPLETED, endedAt: new Date() },
      });
    }
    return { success: true };
  }

  async openPlayer(seasonId: string, playerId: string, timerSeconds?: number) {
    const season = await this.prisma.season.findUnique({ where: { id: seasonId } });
    if (!season || season.auctionStatus !== 'LIVE') {
      throw new BadRequestException('Auction must be live');
    }

    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Player not found');
    if (player.status === 'SOLD') throw new BadRequestException('Player already sold');

    await this.prisma.player.update({
      where: { id: playerId },
      data: { status: PlayerStatus.IN_AUCTION },
    });

    const auction = await this.getActiveAuction(seasonId);
    if (auction) {
      await this.prisma.auction.update({
        where: { id: auction.id },
        data: { currentPlayerId: playerId, timerSeconds },
      });
    }

    return { playerId, timerSeconds, player };
  }

  async placeBid(seasonId: string, playerId: string, captainId: string, amount: number) {
    const season = await this.prisma.season.findUnique({ where: { id: seasonId } });
    if (!season || season.auctionStatus !== 'LIVE') {
      throw new BadRequestException('Auction is not active');
    }

    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player || player.status !== 'IN_AUCTION') {
      throw new BadRequestException('Player is not in auction');
    }

    const captain = await this.prisma.captain.findUnique({ where: { id: captainId } });
    if (!captain) throw new NotFoundException('Captain not found');

    if (amount > captain.remainingBudget) {
      throw new BadRequestException('Bid exceeds remaining budget');
    }

    if (amount < player.basePrice) {
      throw new BadRequestException('Bid must be at least the base price');
    }

    const highestBid = await this.prisma.bid.findFirst({
      where: { seasonId, playerId },
      orderBy: { amount: 'desc' },
    });

    if (highestBid && amount <= highestBid.amount) {
      throw new BadRequestException('Bid must be higher than current highest bid');
    }

    const bid = await this.prisma.bid.create({
      data: { seasonId, playerId, captainId, amount },
    });

    return {
      success: true,
      bid: {
        id: bid.id,
        playerId,
        captainId,
        amount,
        createdAt: bid.createdAt,
      },
    };
  }

  async closePlayer(seasonId: string, playerId: string) {
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Player not found');

    const highestBid = await this.prisma.bid.findFirst({
      where: { seasonId, playerId },
      orderBy: { amount: 'desc' },
      include: { captain: { include: { user: { select: { name: true } } } } },
    });

    if (highestBid) {
      return this.prisma.$transaction(async (tx) => {
        const captain = await tx.captain.findUnique({
          where: { id: highestBid.captainId },
        });

        await tx.player.update({
          where: { id: playerId },
          data: {
            status: PlayerStatus.SOLD,
            soldPrice: highestBid.amount,
            currentTeamId: captain!.teamId,
          },
        });

        await tx.captain.update({
          where: { id: highestBid.captainId },
          data: {
            spentAmount: { increment: highestBid.amount },
            remainingBudget: { decrement: highestBid.amount },
          },
        });

        await tx.auctionResult.create({
          data: {
            seasonId,
            playerId,
            winningCaptainId: highestBid.captainId,
            winningBid: highestBid.amount,
            resultType: 'SOLD',
          },
        });

        return {
          resultType: 'SOLD',
          playerId,
          winnerCaptainId: highestBid.captainId,
          winnerName: highestBid.captain.user.name,
          amount: highestBid.amount,
        };
      });
    } else {
      await this.prisma.player.update({
        where: { id: playerId },
        data: { status: PlayerStatus.UNSOLD },
      });

      await this.prisma.auctionResult.create({
        data: {
          seasonId,
          playerId,
          resultType: 'UNSOLD',
        },
      });

      return { resultType: 'UNSOLD', playerId };
    }
  }

  async getState(seasonId: string) {
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
      select: { auctionStatus: true },
    });

    const auction = await this.getActiveAuction(seasonId);
    const currentPlayer = auction?.currentPlayerId
      ? await this.prisma.player.findUnique({ where: { id: auction.currentPlayerId } })
      : null;

    const highestBid = auction?.currentPlayerId
      ? await this.prisma.bid.findFirst({
          where: { seasonId, playerId: auction.currentPlayerId },
          orderBy: { amount: 'desc' },
          include: { captain: { include: { user: { select: { name: true } } } } },
        })
      : null;

    const captains = await this.prisma.captain.findMany({
      where: { seasonId },
      include: { user: { select: { name: true } }, team: { select: { name: true } } },
    });

    return {
      auctionStatus: season?.auctionStatus,
      currentPlayer,
      highestBid: highestBid
        ? {
            amount: highestBid.amount,
            captainId: highestBid.captainId,
            captainName: highestBid.captain.user.name,
          }
        : null,
      captains: captains.map((c) => ({
        id: c.id,
        name: c.user.name,
        teamName: c.team?.name,
        remainingBudget: c.remainingBudget,
        spentAmount: c.spentAmount,
      })),
      timerSeconds: auction?.timerSeconds,
    };
  }

  async getHistory(seasonId: string) {
    return this.prisma.auctionResult.findMany({
      where: { seasonId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getActiveAuction(seasonId: string) {
    return this.prisma.auction.findFirst({
      where: {
        seasonId,
        status: { in: [AuctionStatus.LIVE, AuctionStatus.PAUSED] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
