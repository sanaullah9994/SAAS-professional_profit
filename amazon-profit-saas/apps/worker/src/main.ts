import 'dotenv/config';
import IORedis from 'ioredis';
import { Queue,Worker,type Job } from 'bullmq';
import { pool,query,transaction } from '@amazon-profit/db';
import type { SyncJobData } from '@amazon-profit/types';
import { calculateProfit,getDateRange } from '@amazon-profit/utils';
const prefix=process.env.QUEUE_PREFIX??'amazon-profit';
const qconn=new IORedis(process.env.REDIS_URL??'redis://localhost:6379',{maxRetriesPerRequest:null});
const wconn=new IORedis(process.env.REDIS_URL??'redis://localhost:6379',{maxRetriesPerRequest:null});
const queue=new Queue<SyncJobData>('amazon-sync',{connection:qconn,prefix});
async function sync(job:Job<SyncJobData>){
  const range=getDateRange(Number(process.env.INITIAL_SYNC_DAYS??90));
  const account=job.data.amazonAccountId??process.env.MOCK_AMAZON_ACCOUNT_ID!;
  const workspace=job.data.workspaceId??process.env.MOCK_WORKSPACE_ID!;
  const run=(await query<{id:string}>(`INSERT INTO sync_runs(amazon_account_id,workspace_id,trigger,status,from_date,to_date,started_at) VALUES($1,$2,$3,'running',$4,$5,now()) RETURNING id::text`,[account,workspace,job.data.trigger,job.data.from??range.from,job.data.to??range.to])).rows[0]!.id;
  try{
    const products=(await query<any>('SELECT id::text,sku,asin FROM products WHERE amazon_account_id=$1',[account])).rows;
    let records=0;
    await transaction(async c=>{
      for(const p of products){
        const units=8+Math.floor(Math.random()*10),price=29.99,revenue=units*price,adSpend=25+Math.random()*20;
        const costs=(await c.query<any>(`SELECT * FROM cogs_history WHERE workspace_id=$1 AND sku=$2 AND effective_from<=current_date ORDER BY effective_from DESC LIMIT 1`,[workspace,p.sku])).rows[0]??{};
        const r=calculateProfit({productRevenue:revenue,shippingRevenue:0,promotionalRebates:1.5,referralFees:revenue*.15,fulfillmentFees:units*4.4,storageFees:units*.08,refunds:0,refundAdminFees:0,adSpend,cogs:units*Number(costs.unit_cogs??0),inboundFreight:units*Number(costs.inbound_freight_per_unit??0),customs:units*Number(costs.customs_per_unit??0),prepFees:units*Number(costs.prep_fee_per_unit??0),otherOperatingCosts:units*.2});
        await c.query(`INSERT INTO profit_daily(workspace_id,amazon_account_id,product_id,dimension_key,sku,asin,date,units,product_revenue,promotional_rebates,referral_fees,fulfillment_fees,storage_fees,ad_spend,cogs,inbound_freight,customs,prep_fees,other_operating_costs,net_profit) VALUES($1,$2,$3,$3::text,$4,$5,current_date,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) ON CONFLICT(amazon_account_id,date,dimension_key) DO UPDATE SET units=excluded.units,product_revenue=excluded.product_revenue,ad_spend=excluded.ad_spend,net_profit=excluded.net_profit,calculated_at=now()`,[workspace,account,p.id,p.sku,p.asin,units,r.productRevenue,r.promotionalRebates,r.referralFees,r.fulfillmentFees,r.storageFees,r.adSpend,r.cogs,r.inboundFreight,r.customs,r.prepFees,r.otherOperatingCosts,r.netProfit]);
        records++;
      }
      await c.query('UPDATE amazon_accounts SET last_synced_at=now(),updated_at=now() WHERE id=$1',[account]);
    });
    await query(`UPDATE sync_runs SET status='completed',records_processed=$2,completed_at=now() WHERE id=$1`,[run,records]);
    return{run,records};
  }catch(e){await query(`UPDATE sync_runs SET status='failed',error_message=$2,completed_at=now() WHERE id=$1`,[run,e instanceof Error?e.message:String(e)]);throw e}
}
const worker=new Worker<SyncJobData>('amazon-sync',async job=>{
  if(job.name==='sync-all-accounts'){const accounts=(await query<any>(`SELECT id::text,workspace_id::text FROM amazon_accounts WHERE status='connected'`)).rows;const range=getDateRange(2);for(const a of accounts)await queue.add('sync-account',{trigger:'scheduled',amazonAccountId:a.id,workspaceId:a.workspace_id,...range});return{queued:accounts.length}}
  return sync(job);
},{connection:wconn,prefix,concurrency:Number(process.env.WORKER_CONCURRENCY??4)});
await queue.upsertJobScheduler('hourly-amazon-sync',{every:Number(process.env.SYNC_INTERVAL_MS??3600000)},{name:'sync-all-accounts',data:{trigger:'scheduled'}});
worker.on('completed',j=>console.log('[worker] completed',j.id));
worker.on('failed',(j,e)=>console.error('[worker] failed',j?.id,e));
console.log('[worker] started');
const stop=async()=>{await worker.close();await queue.close();await qconn.quit();await wconn.quit();await pool.end();process.exit(0)};
process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
