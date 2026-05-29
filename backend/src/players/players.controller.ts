import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PlayersService } from './players.service';
import { PlayerStatus } from '@prisma/client';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  IsArray,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreatePlayerDto {
  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  seasonId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  position: string;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsOptional()
  @IsNumber()
  age?: number;

  @IsOptional()
  @IsString()
  preferredFoot?: string;

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdatePlayerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsNumber()
  age?: number;

  @IsOptional()
  @IsString()
  preferredFoot?: string;

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(PlayerStatus)
  status?: PlayerStatus;
}

class ImportPlayerItem {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  position: string;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsOptional()
  @IsNumber()
  age?: number;

  @IsOptional()
  @IsString()
  preferredFoot?: string;

  @IsOptional()
  @IsNumber()
  rating?: number;
}

class ImportPlayersDto {
  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  seasonId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportPlayerItem)
  players: ImportPlayerItem[];
}

@Controller('players')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PlayersController {
  constructor(private playersService: PlayersService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreatePlayerDto) {
    return this.playersService.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'CAPTAIN', 'PLAYER')
  findAll(
    @Query('seasonId') seasonId?: string,
    @Query('status') status?: PlayerStatus,
    @Query('position') position?: string,
    @Query('search') search?: string,
  ) {
    return this.playersService.findAll({ seasonId, status, position, search });
  }

  @Get(':id')
  @Roles('ADMIN', 'CAPTAIN', 'PLAYER')
  findOne(@Param('id') id: string) {
    return this.playersService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdatePlayerDto) {
    return this.playersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.playersService.remove(id);
  }

  @Post('import')
  @Roles('ADMIN')
  importPlayers(@Body() dto: ImportPlayersDto) {
    return this.playersService.importPlayers(dto.seasonId, dto.players);
  }
}
