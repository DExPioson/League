import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CaptainsService } from './captains.service';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

class CreateCaptainDto {
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  @IsString()
  teamName: string;

  @IsUUID()
  seasonId: string;
}

@Controller('captains')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CaptainsController {
  constructor(private captainsService: CaptainsService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateCaptainDto) {
    return this.captainsService.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'CAPTAIN', 'PLAYER')
  findAll(@Query('seasonId') seasonId?: string) {
    return this.captainsService.findAll(seasonId);
  }

  @Get(':id')
  @Roles('ADMIN', 'CAPTAIN', 'PLAYER')
  findOne(@Param('id') id: string) {
    return this.captainsService.findOne(id);
  }

  @Get(':id/team')
  @Roles('ADMIN', 'CAPTAIN', 'PLAYER')
  getTeam(@Param('id') id: string) {
    return this.captainsService.getTeam(id);
  }

  @Get(':id/budget')
  @Roles('ADMIN', 'CAPTAIN')
  getBudget(@Param('id') id: string) {
    return this.captainsService.getBudget(id);
  }
}
