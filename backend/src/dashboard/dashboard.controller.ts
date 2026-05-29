import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('admin/:seasonId')
  @Roles('ADMIN')
  getAdminDashboard(@Param('seasonId') seasonId: string) {
    return this.dashboardService.getAdminDashboard(seasonId);
  }

  @Get('captain/:seasonId')
  @Roles('CAPTAIN')
  getCaptainDashboard(
    @Param('seasonId') seasonId: string,
    @CurrentUser() user: any,
  ) {
    return this.dashboardService.getCaptainDashboard(seasonId, user.id);
  }

  @Get('player/:seasonId')
  @Roles('PLAYER')
  getPlayerDashboard(
    @Param('seasonId') seasonId: string,
    @CurrentUser() user: any,
  ) {
    return this.dashboardService.getPlayerDashboard(seasonId, user.id);
  }
}
