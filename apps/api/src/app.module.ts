import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller.js';
import { SyncController, SyncQueueService } from './sync/sync.controller.js';
@Module({
  imports:[
    ConfigModule.forRoot({isGlobal:true,envFilePath:['../../.env','.env']}),
  ],
  controllers:[HealthController,SyncController],
  providers:[SyncQueueService]
})
export class AppModule{}
