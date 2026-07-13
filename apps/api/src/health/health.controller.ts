import { Controller,Get } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { query } from '@amazon-profit/db';
@Controller('v1/health')
export class HealthController{
  @Get() @AllowAnonymous() async get(){await query('SELECT 1');return{status:'ok',database:'connected',provider:process.env.AMAZON_PROVIDER??'mock',timestamp:new Date().toISOString()}}
}
