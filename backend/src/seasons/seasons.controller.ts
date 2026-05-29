import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SeasonsService } from './seasons.service';
import { IsNotEmpty, IsString, IsNumber, IsOptional, Min } from 'class-validator';

class CreateSeasonDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNumber()
  @Min(1)
  budgetPerCaptain: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  transferLimit?: number;
}

class UpdateSeasonDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  budgetPerCaptain?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  transferLimit?: number;
}

@Controller('seasons')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SeasonsController {
  constructor(private seasonsService: SeasonsService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateSeasonDto) {
    return this.seasonsService.create(dto);
  }

  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.seasonsService.findAll();
  }

  @Get('active')
  @Roles('ADMIN', 'CAPTAIN', 'PLAYER')
  findActive() {
    return this.seasonsService.findActive();
  }

  @Get(':id')
  @Roles('ADMIN')
  findOne(@Param('id') id: string) {
    return this.seasonsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateSeasonDto) {
    return this.seasonsService.update(id, dto);
  }

  @Patch(':id/activate')
  @Roles('ADMIN')
  activate(@Param('id') id: string) {
    return this.seasonsService.activate(id);
  }

  @Patch(':id/archive')
  @Roles('ADMIN')
  archive(@Param('id') id: string) {
    return this.seasonsService.archive(id);
  }

  @Patch(':id/transfer-window/open')
  @Roles('ADMIN')
  openTransferWindow(@Param('id') id: string) {
    return this.seasonsService.openTransferWindow(id);
  }

  @Patch(':id/transfer-window/close')
  @Roles('ADMIN')
  closeTransferWindow(@Param('id') id: string) {
    return this.seasonsService.closeTransferWindow(id);
  }
}
