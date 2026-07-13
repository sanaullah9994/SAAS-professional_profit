import { Body,Controller,Get,Post,Query,UploadedFile,UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OptionalAuth } from '@thallesp/nestjs-better-auth';
import { parse } from 'csv-parse/sync';
import { listTable,query } from '@amazon-profit/db';
import { workspaceId } from '../common/workspace.js';
@Controller('v1/cogs') @OptionalAuth()
export class CogsController{
  @Get() list(@Query('workspaceId') id?:string){return listTable('cogs_history',workspaceId(id))}
  @Post() async save(@Body() b:any,@Query('workspaceId') id?:string){return(await query(`INSERT INTO cogs_history(workspace_id,sku,effective_from,effective_to,unit_cogs,inbound_freight_per_unit,customs_per_unit,prep_fee_per_unit,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(workspace_id,sku,effective_from) DO UPDATE SET effective_to=excluded.effective_to,unit_cogs=excluded.unit_cogs,inbound_freight_per_unit=excluded.inbound_freight_per_unit,customs_per_unit=excluded.customs_per_unit,prep_fee_per_unit=excluded.prep_fee_per_unit,notes=excluded.notes,updated_at=now() RETURNING *`,[workspaceId(id),b.sku,b.effectiveFrom,b.effectiveTo??null,b.unitCogs,b.inboundFreightPerUnit??0,b.customsPerUnit??0,b.prepFeePerUnit??0,b.notes??null])).rows[0]}
  @Post('upload') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:2_000_000}}))
  async upload(@UploadedFile() file:Express.Multer.File,@Query('workspaceId') id?:string){const rows=parse(file.buffer,{columns:true,skip_empty_lines:true,trim:true}) as any[];for(const r of rows)await this.save({sku:r.sku,effectiveFrom:r.effective_from,unitCogs:Number(r.unit_cogs),inboundFreightPerUnit:Number(r.inbound_freight_per_unit??0),customsPerUnit:Number(r.customs_per_unit??0),prepFeePerUnit:Number(r.prep_fee_per_unit??0)},id);return{imported:rows.length}}
}
