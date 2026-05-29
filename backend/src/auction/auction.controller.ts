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
import { IsUUID, IsNumber, Min, IsOptional } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

class StartAuctionDto {
  @IsUUID()
  seasonId: string;
}

class OpenPlayerDto {
  @IsUUID()
  seasonId: string;

  @IsUUID()
  playerId: string;

  @IsOptional()
  @IsNumber()
  @Min(10)
  timerSeconds?: number;
}

class PlaceBidDto {
  @IsUUID()
  seasonId: string;

  @IsUUID()
  playerId: string;

  @IsNumber()
  @Min(1)
  amount: number;
}

class ClosePlayerDto {
  @IsUUID()
  seasonId: string;

  @IsUUID()
  playerId: string;
}

@Controller('auction')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AuctionController {
  constructor(
    private auctionService: AuctionService,
    private prisma: PrismaService,
  ) {}

  @Post('start')
  @Roles('ADMIN')
  start(@Body() dto: StartAuctionDto) {
    return this.auctionService.startAuction(dto.seasonId);
  }

  @Post('pause')
  @Roles('ADMIN')
  pause(@Body() dto: StartAuctionDto) {
    return this.auctionService.pauseAuction(dto.seasonId);
  }

  @Post('resume')
  @Roles('ADMIN')
  resume(@Body() dto: StartAuctionDto) {
    return this.auctionService.resumeAuction(dto.seasonId);
  }

  @Post('end')
  @Roles('ADMIN')
  end(@Body() dto: StartAuctionDto) {
    return this.auctionService.endAuction(dto.seasonId);
  }

  @Post('open-player')
  @Roles('ADMIN')
  openPlayer(@Body() dto: OpenPlayerDto) {
    return this.auctionService.openPlayer(dto.seasonId, dto.playerId, dto.timerSeconds);
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
  closePlayer(@Body() dto: ClosePlayerDto) {
    return this.auctionService.closePlayer(dto.seasonId, dto.playerId);
  }

  @Get('state/:seasonId')
  @Roles('ADMIN', 'CAPTAIN', 'PLAYER')
  getState(@Param('seasonId') seasonId: string) {
    return this.auctionService.getState(seasonId);
  }

  @Get('history/:seasonId')
  @Roles('ADMIN', 'CAPTAIN', 'PLAYER')
  getHistory(@Param('seasonId') seasonId: string) {
    return this.auctionService.getHistory(seasonId);
  }
}
