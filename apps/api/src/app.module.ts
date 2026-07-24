import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './auth/auth.js';
import { HealthController } from './health/health.controller.js';
import { DashboardController } from './dashboard/dashboard.controller.js';
import { ProfitController } from './profit/profit.controller.js';
import { AmazonController } from './amazon/amazon.controller.js';
import { SyncController, SyncQueueService } from './sync/sync.controller.js';
import { CogsController } from './cogs/cogs.controller.js';
import { DataController } from './routes/data.controller.js';
import { TrafficController } from './traffic/traffic.controller.js';
import { AuthExtraController } from './auth/auth-extra.controller.js';
import { AuthHooksService } from './auth/auth-hooks.service.js';
@Module({
  imports:[
    ConfigModule.forRoot({isGlobal:true,envFilePath:['../../.env','.env']}),
    AuthModule.forRoot({auth,bodyParser:{json:{limit:'2mb'},urlencoded:{limit:'2mb',extended:true}}})
  ],
  controllers:[HealthController,DashboardController,ProfitController,AmazonController,SyncController,CogsController,DataController,TrafficController,AuthExtraController],
  providers:[SyncQueueService,AuthHooksService]
})
export class AppModule{}
