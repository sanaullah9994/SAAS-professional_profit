import { Controller,Get,Query } from '@nestjs/common';
import { OptionalAuth } from '@thallesp/nestjs-better-auth';
import { listTable,query } from '@amazon-profit/db';
import { workspaceId } from '../common/workspace.js';
@Controller('v1') @OptionalAuth()
export class DataController{
  @Get('orders') orders(@Query('workspaceId') id?:string){return listTable('orders',workspaceId(id))}
  @Get('refunds') refunds(@Query('workspaceId') id?:string){return listTable('refunds',workspaceId(id))}
  @Get('alerts') alerts(@Query('workspaceId') id?:string){return listTable('alerts',workspaceId(id))}
  @Get('ppc/summary') async ppc(@Query('workspaceId') id?:string,@Query('days') days='30'){const {rows}=await query<any>(`SELECT COALESCE(SUM(a.spend),0) spend,COALESCE(SUM(a.attributed_sales),0) sales,COALESCE(SUM(a.impressions),0) impressions,COALESCE(SUM(a.clicks),0) clicks,COALESCE(SUM(a.attributed_orders),0) orders,COALESCE(SUM(a.spend) FILTER(WHERE a.product_id IS NULL),0) unattributed FROM ad_spend_daily a JOIN amazon_accounts aa ON aa.id=a.amazon_account_id WHERE aa.workspace_id=$1 AND a.date>=current_date-($2::int-1)`,[workspaceId(id),Number(days)||30]);const r=rows[0]??{},spend=Number(r.spend),sales=Number(r.sales),clicks=Number(r.clicks),impressions=Number(r.impressions);return{spend,sales,acosPercent:sales?spend/sales*100:0,roas:spend?sales/spend:0,clicks,impressions,ctrPercent:impressions?clicks/impressions*100:0,cpc:clicks?spend/clicks:0,orders:Number(r.orders),unattributedSpend:Number(r.unattributed)}}
}
