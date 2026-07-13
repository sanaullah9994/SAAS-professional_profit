import { pool, transaction } from './index.js';
const ids={user:'mock-user-id',org:'00000000-0000-0000-0000-000000000001',workspace:'00000000-0000-0000-0000-000000000101',account:'00000000-0000-0000-0000-000000000201'};
await transaction(async c=>{
  await c.query(`INSERT INTO users(id,name,email,email_verified) VALUES($1,'Demo Owner','demo@example.com',true) ON CONFLICT DO NOTHING`,[ids.user]);
  await c.query(`INSERT INTO organizations(id,name,slug) VALUES($1,'Demo Commerce','demo-commerce') ON CONFLICT DO NOTHING`,[ids.org]);
  await c.query(`INSERT INTO organization_members VALUES($1,$2,'owner',now()) ON CONFLICT DO NOTHING`,[ids.org,ids.user]);
  await c.query(`INSERT INTO workspaces(id,organization_id,name,slug) VALUES($1,$2,'Northstar Brand','northstar-brand') ON CONFLICT DO NOTHING`,[ids.workspace,ids.org]);
  await c.query(`INSERT INTO amazon_accounts(id,workspace_id,seller_id,display_name,status,provider_mode,connected_at,last_synced_at) VALUES($1,$2,'A1MOCKSELLER','Amazon.com — Demo','connected','mock',now(),now()) ON CONFLICT(id) DO UPDATE SET last_synced_at=now()`,[ids.account,ids.workspace]);
  const products=[
    ['00000000-0000-0000-0000-000000001001','NS-BOTTLE-32-BLK','B0DEMO0001','Insulated Water Bottle 32 oz — Black'],
    ['00000000-0000-0000-0000-000000001002','NS-BOTTLE-32-BLU','B0DEMO0002','Insulated Water Bottle 32 oz — Blue'],
    ['00000000-0000-0000-0000-000000001003','NS-LUNCH-01','B0DEMO0003','Insulated Lunch Bag'],
    ['00000000-0000-0000-0000-000000001004','NS-TUMBLER-20','B0DEMO0004','Stainless Steel Tumbler 20 oz']
  ];
  for(let i=0;i<products.length;i++){const [id,sku,asin,title]=products[i]!;
    await c.query(`INSERT INTO products(id,amazon_account_id,sku,asin,title) VALUES($1,$2,$3,$4,$5) ON CONFLICT(amazon_account_id,sku) DO UPDATE SET title=excluded.title`,[id,ids.account,sku,asin,title]);
    await c.query(`INSERT INTO cogs_history(workspace_id,sku,effective_from,unit_cogs,inbound_freight_per_unit,customs_per_unit,prep_fee_per_unit) VALUES($1,$2,current_date-365,8.25,0.85,0.35,0.30) ON CONFLICT DO NOTHING`,[ids.workspace,sku]);
    await c.query(`INSERT INTO profit_daily(workspace_id,amazon_account_id,product_id,dimension_key,sku,asin,date,units,product_revenue,promotional_rebates,referral_fees,fulfillment_fees,storage_fees,refunds,refund_admin_fees,ad_spend,cogs,inbound_freight,customs,prep_fees,other_operating_costs,net_profit)
      SELECT $1,$2,$3::uuid,$3::text,$4,$5,d::date,(8+$6*2)::int,
      round(((8+$6*2)*(24.99+$6*3)+120*sin(extract(epoch from d)/90000))::numeric,2),1.5,
      26+$6*4,34+$6*5,1.2,CASE WHEN extract(day from d)::int%17=0 THEN 24 ELSE 0 END,CASE WHEN extract(day from d)::int%17=0 THEN 5 ELSE 0 END,
      28+$6*4,72+$6*12,8+$6,3+$6*.4,2.5+$6*.3,4+$6*.5,
      round((((8+$6*2)*(24.99+$6*3)+120*sin(extract(epoch from d)/90000)+1.5)-(26+$6*4)-(34+$6*5)-1.2-(28+$6*4)-(72+$6*12)-(8+$6)-(3+$6*.4)-(2.5+$6*.3)-(4+$6*.5))::numeric,2)
      FROM generate_series(current_date-89,current_date,interval '1 day') d
      ON CONFLICT(amazon_account_id,date,dimension_key) DO UPDATE SET net_profit=excluded.net_profit,product_revenue=excluded.product_revenue`,[ids.workspace,ids.account,id,sku,asin,i]);
  }
  await c.query(`INSERT INTO profit_daily(workspace_id,amazon_account_id,dimension_key,date,ad_spend,net_profit) SELECT $1,$2,'unattributed',d::date,5,-5 FROM generate_series(current_date-89,current_date,interval '1 day') d ON CONFLICT DO NOTHING`,[ids.workspace,ids.account]);
  await c.query(`INSERT INTO sync_runs(amazon_account_id,workspace_id,trigger,status,from_date,to_date,records_processed,started_at,completed_at) VALUES($1,$2,'initial','completed',now()-interval '90 days',now(),18420,now()-interval '12 minutes',now()-interval '3 minutes')`,[ids.account,ids.workspace]);
  await c.query(`INSERT INTO alerts(workspace_id,amazon_account_id,severity,type,title,message) VALUES
    ($1,$2,'warning','margin_drop','Margin declined for NS-LUNCH-01','Net margin is below the target.'),
    ($1,$2,'info','cogs_stale','Review COGS for 2 SKUs','Two SKUs have old COGS records.'),
    ($1,$2,'critical','ppc_spike','Unattributed ad spend increased','Unattributed spend is above its seven-day average.')`,[ids.workspace,ids.account]);
});
console.log('[db] seeded');
await pool.end();
