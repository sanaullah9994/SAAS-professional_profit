import { Controller,Get,Query } from '@nestjs/common';
import { OptionalAuth } from '@thallesp/nestjs-better-auth';
import { getOverview,getProfitTrend } from '@amazon-profit/db';
import { workspaceId } from '../common/workspace.js';
@Controller('v1/dashboard') @OptionalAuth()
export class DashboardController{
  @Get('overview') async overview(@Query('workspaceId') id?:string,@Query('days') days='30'){
    const w=workspaceId(id),d=Math.min(90,Math.max(1,Number(days)||30));
    const [summary,trend]=await Promise.all([getOverview(w,d),getProfitTrend(w,d)]);
    return{summary,trend,period:d};
  }
}
