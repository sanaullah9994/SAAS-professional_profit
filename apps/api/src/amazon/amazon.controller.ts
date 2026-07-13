import { Controller,Get,Post,Query } from '@nestjs/common';
import { OptionalAuth } from '@thallesp/nestjs-better-auth';
import { listTable,query } from '@amazon-profit/db';
import { workspaceId } from '../common/workspace.js';
@Controller('v1/amazon/connections') @OptionalAuth()
export class AmazonController{
  @Get() list(@Query('workspaceId') id?:string){return listTable('amazon_accounts',workspaceId(id))}
  @Post('seller-central/mock') async seller(@Query('workspaceId') id?:string){const w=workspaceId(id),a=process.env.MOCK_AMAZON_ACCOUNT_ID??'00000000-0000-0000-0000-000000000201';await query(`INSERT INTO amazon_accounts(id,workspace_id,seller_id,display_name,status,provider_mode,connected_at) VALUES($1,$2,'A1MOCKSELLER','Amazon.com — Mock','connected','mock',now()) ON CONFLICT(id) DO UPDATE SET status='connected',connected_at=now()`,[a,w]);return{id:a,status:'connected',mode:'mock'}}
  @Post('ads/mock') async ads(){const a=process.env.MOCK_AMAZON_ACCOUNT_ID??'00000000-0000-0000-0000-000000000201';await query(`INSERT INTO amazon_ad_accounts(amazon_account_id,profile_id,display_name,status,connected_at) VALUES($1,'999999999999','Amazon Ads — Mock','connected',now())`,[a]);return{status:'connected',mode:'mock'}}
}
