import { Controller,Get } from '@nestjs/common';
import { query } from '@amazon-profit/db';
@Controller('v1/health')
export class HealthController{
  @Get() async get(){await query('SELECT 1');return{status:'ok',database:'connected',provider:process.env.AMAZON_PROVIDER??'mock',timestamp:new Date().toISOString()}}
}
