import { Body,Controller,Get,Injectable,OnModuleDestroy,Post,Query } from '@nestjs/common';
import { OptionalAuth } from '@thallesp/nestjs-better-auth';
import { Queue } from 'bullmq';
import type { SyncJobData } from '@amazon-profit/types';
import { getDateRange } from '@amazon-profit/utils';
import { listTable } from '@amazon-profit/db';
import { workspaceId } from '../common/workspace.js';
import { redisConnection } from '../queue/redis.js';
@Injectable()
export class SyncQueueService implements OnModuleDestroy{
  private connection=redisConnection();
  private queue=new Queue<SyncJobData>('amazon-sync',{connection:this.connection,prefix:process.env.QUEUE_PREFIX??'amazon-profit'});
  async add(data:Partial<SyncJobData>){const range=getDateRange(Number(process.env.INITIAL_SYNC_DAYS??90));const job=await this.queue.add('sync-account',{trigger:'manual',amazonAccountId:data.amazonAccountId??process.env.MOCK_AMAZON_ACCOUNT_ID,workspaceId:data.workspaceId??process.env.MOCK_WORKSPACE_ID,from:data.from??range.from,to:data.to??range.to},{attempts:5,backoff:{type:'exponential',delay:5000},removeOnComplete:{count:1000},removeOnFail:{count:1000}});return{jobId:job.id,status:'queued'}}
  async onModuleDestroy(){await this.queue.close();await this.connection.quit()}
}
@Controller('v1/sync') @OptionalAuth()
export class SyncController{
  constructor(private queue:SyncQueueService){}
  @Post() add(@Body() body:Partial<SyncJobData>){return this.queue.add(body)}
  @Get('history') history(@Query('workspaceId') id?:string){return listTable('sync_runs',workspaceId(id))}
}
