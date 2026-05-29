import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SeasonsModule } from './seasons/seasons.module';
import { PlayersModule } from './players/players.module';
import { CaptainsModule } from './captains/captains.module';
import { AuctionModule } from './auction/auction.module';
import { TransfersModule } from './transfers/transfers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    SeasonsModule,
    PlayersModule,
    CaptainsModule,
    AuctionModule,
    TransfersModule,
    DashboardModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
