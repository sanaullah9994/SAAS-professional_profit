import { Controller,Get,Query } from '@nestjs/common';
import { OptionalAuth } from '@thallesp/nestjs-better-auth';
import { getTrafficRaw } from '@amazon-profit/db';
import { workspaceId } from '../common/workspace.js';
@Controller('v1/traffic') @OptionalAuth()
export class TrafficController{
  @Get('raw') raw(@Query('workspaceId') id?:string,@Query('days') days='30'){
    const w=workspaceId(id),d=Math.min(90,Math.max(1,Number(days)||30));
    return getTrafficRaw(w,d);
  }
}
