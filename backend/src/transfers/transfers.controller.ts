import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TransfersService } from './transfers.service';
import { TransferStatus } from '@prisma/client';
import { IsUUID, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

class CreateTransferDto {
  @IsUUID()
  seasonId: string;

  @IsUUID()
  playerId: string;

  @IsUUID()
  fromCaptainId: string;

  @IsUUID()
  toCaptainId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

@Controller('transfers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TransfersController {
  constructor(
    private transfersService: TransfersService,
    private prisma: PrismaService,
  ) {}

  @Post()
  @Roles('CAPTAIN')
  async create(@Body() dto: CreateTransferDto, @CurrentUser() user: any) {
    return this.transfersService.create({
      ...dto,
      requestedById: user.id,
    });
  }

  @Get()
  @Roles('ADMIN', 'CAPTAIN')
  findAll(
    @Query('seasonId') seasonId?: string,
    @Query('status') status?: TransferStatus,
    @Query('captainId') captainId?: string,
  ) {
    return this.transfersService.findAll({ seasonId, status, captainId });
  }

  @Patch(':id/accept')
  @Roles('CAPTAIN')
  async accept(@Param('id') id: string, @CurrentUser() user: any) {
    const captain = await this.prisma.captain.findUnique({ where: { userId: user.id } });
    if (!captain) throw new Error('Captain not found');
    return this.transfersService.accept(id, captain.id);
  }

  @Patch(':id/reject')
  @Roles('CAPTAIN')
  async reject(@Param('id') id: string, @CurrentUser() user: any) {
    const captain = await this.prisma.captain.findUnique({ where: { userId: user.id } });
    if (!captain) throw new Error('Captain not found');
    return this.transfersService.reject(id, captain.id);
  }

  @Patch(':id/approve')
  @Roles('ADMIN')
  approve(@Param('id') id: string) {
    return this.transfersService.approve(id);
  }

  @Patch(':id/cancel')
  @Roles('CAPTAIN', 'ADMIN')
  cancel(@Param('id') id: string) {
    return this.transfersService.cancel(id);
  }

  @Get('history/:seasonId')
  @Roles('ADMIN', 'CAPTAIN', 'PLAYER')
  getHistory(@Param('seasonId') seasonId: string) {
    return this.transfersService.getHistory(seasonId);
  }
}
