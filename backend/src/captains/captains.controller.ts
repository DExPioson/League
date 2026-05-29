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
import { IsNotEmpty, IsString, Matches } from 'class-validator';

class CreateCaptainDto {
  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  userId: string;

  @IsNotEmpty()
  @IsString()
  teamName: string;

  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
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

  @Get('previous/suggestions')
  @Roles('ADMIN')
  getPreviousCaptains(@Query('seasonId') seasonId?: string) {
    return this.captainsService.getPreviousCaptains(seasonId);
  }

  @Get(':id/budget')
  @Roles('ADMIN', 'CAPTAIN')
  getBudget(@Param('id') id: string) {
    return this.captainsService.getBudget(id);
  }
}
