import { Controller,Get,Query,Res } from '@nestjs/common';
import type { Response } from 'express';
import { OptionalAuth } from '@thallesp/nestjs-better-auth';
import { getOverview,getProfitTrend,getSkuProfitability,getProductEconomics } from '@amazon-profit/db';
import { workspaceId } from '../common/workspace.js';
@Controller('v1/profit') @OptionalAuth()
export class ProfitController{
  @Get('p-and-l') async pnl(@Query('workspaceId') id?:string,@Query('days') days='30'){const w=workspaceId(id),d=Number(days)||30;return{summary:await getOverview(w,d),trend:await getProfitTrend(w,d)}}
  @Get('skus') skus(@Query('workspaceId') id?:string,@Query('days') days='30'){return getSkuProfitability(workspaceId(id),Number(days)||30)}
  @Get('calculator') calculator(@Query('workspaceId') id?:string,@Query('days') days='30'){return getProductEconomics(workspaceId(id),Number(days)||30)}
  @Get('skus.csv') async csv(@Res() res:Response,@Query('workspaceId') id?:string){const rows=await getSkuProfitability(workspaceId(id),30);const keys=['sku','asin','title','units','revenue','amazonFees','adSpend','cogs','refunds','netProfit','marginPercent'] as const;const cell=(v:unknown)=>`"${String(v??'').replaceAll('"','""')}"`;res.type('text/csv').attachment('sku-profitability.csv').send([keys.join(','),...rows.map(r=>keys.map(k=>cell(r[k])).join(','))].join('\n'))}
}
