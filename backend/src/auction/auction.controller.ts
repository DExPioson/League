import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuctionService } from './auction.service';
import { AuctionGateway } from './auction.gateway';
import { IsString, IsNumber, Min, IsOptional, Matches } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

class StartAuctionDto {
  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  seasonId: string;
}

class OpenPlayerDto {
  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  seasonId: string;

  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  playerId: string;

  @IsOptional()
  @IsNumber()
  @Min(10)
  timerSeconds?: number;
}

class PlaceBidDto {
  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  seasonId: string;

  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  playerId: string;

  @IsNumber()
  @Min(1)
  amount: number;
}

class ClosePlayerDto {
  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  seasonId: string;

  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  playerId: string;
}

@Controller('auction')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AuctionController {
  constructor(
    private auctionService: AuctionService,
    private auctionGateway: AuctionGateway,
    private prisma: PrismaService,
  ) {}

  @Post('start')
  @Roles('ADMIN')
  async start(@Body() dto: StartAuctionDto) {
    const result = await this.auctionService.startAuction(dto.seasonId);
    await this.auctionGateway.broadcastAuctionStatusChange(dto.seasonId);
    return result;
  }

  @Post('pause')
  @Roles('ADMIN')
  async pause(@Body() dto: StartAuctionDto) {
    const result = await this.auctionService.pauseAuction(dto.seasonId);
    await this.auctionGateway.broadcastAuctionStatusChange(dto.seasonId);
    return result;
  }

  @Post('resume')
  @Roles('ADMIN')
  async resume(@Body() dto: StartAuctionDto) {
    const result = await this.auctionService.resumeAuction(dto.seasonId);
    await this.auctionGateway.broadcastAuctionStatusChange(dto.seasonId);
    return result;
  }

  @Post('end')
  @Roles('ADMIN')
  async end(@Body() dto: StartAuctionDto) {
    const result = await this.auctionService.endAuction(dto.seasonId);
    await this.auctionGateway.broadcastAuctionStatusChange(dto.seasonId);
    return result;
  }

  @Post('open-player')
  @Roles('ADMIN')
  async openPlayer(@Body() dto: OpenPlayerDto) {
    const result = await this.auctionService.openPlayer(dto.seasonId, dto.playerId, dto.timerSeconds);
    await this.auctionGateway.broadcastPlayerOpened(dto.seasonId);
    return result;
  }

  @Post('place-bid')
  @Roles('CAPTAIN')
  async placeBid(@Body() dto: PlaceBidDto, @CurrentUser() user: any) {
    const captain = await this.prisma.captain.findUnique({
      where: { userId: user.id },
    });
    if (!captain) throw new Error('Captain profile not found');
    return this.auctionService.placeBid(dto.seasonId, dto.playerId, captain.id, dto.amount);
  }

  @Post('close-player')
  @Roles('ADMIN')
  async closePlayer(@Body() dto: ClosePlayerDto) {
    const result = await this.auctionService.closePlayer(dto.seasonId, dto.playerId);
    await this.auctionGateway.broadcastPlayerClosed(dto.seasonId, result);
    return result;
  }

  @Get('state/:seasonId')
  @Roles('ADMIN', 'CAPTAIN', 'PLAYER')
  async getState(@Param('seasonId') seasonId: string) {
    const state = await this.auctionService.getState(seasonId);
    const timerEndsAt = this.auctionGateway.getTimerEndsAt(seasonId);
    return { ...state, timerEndsAt };
  }

  @Get('history/:seasonId')
  @Roles('ADMIN', 'CAPTAIN', 'PLAYER')
  getHistory(@Param('seasonId') seasonId: string) {
    return this.auctionService.getHistory(seasonId);
  }
}
