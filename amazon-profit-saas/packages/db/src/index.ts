import './env.js';
import pg, { type PoolClient, type QueryResultRow } from 'pg';
const { Pool } = pg;
const connectionString = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/amazon_profit';
export const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'true' || connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
});
export const query = <T extends QueryResultRow = QueryResultRow>(text: string, params: readonly unknown[] = []) =>
  pool.query<T>(text, [...params]);
export async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
const num = (v: unknown) => Number(v ?? 0);
export async function getOverview(workspaceId: string, days = 30) {
  const { rows } = await query<any>(`SELECT
    COALESCE(SUM(product_revenue + shipping_revenue + promotional_rebates),0) revenue,
    COALESCE(SUM(net_profit),0) profit, COALESCE(SUM(ad_spend),0) ad_spend,
    COALESCE(SUM(refunds),0) refunds, COALESCE(SUM(units),0) units
    FROM profit_daily WHERE workspace_id=$1 AND date >= current_date - ($2::int - 1)`, [workspaceId, days]);
  const r = rows[0] ?? {}; const revenue = num(r.revenue); const profit = num(r.profit); const adSpend = num(r.ad_spend);
  return { revenue, profit, adSpend, refunds:num(r.refunds), units:num(r.units), marginPercent:revenue?profit/revenue*100:0, tacosPercent:revenue?adSpend/revenue*100:0 };
}
export async function getProfitTrend(workspaceId: string, days = 30) {
  const { rows } = await query<any>(`SELECT date::text,
    SUM(product_revenue+shipping_revenue+promotional_rebates) revenue,
    SUM(net_profit) profit, SUM(ad_spend) ad_spend
    FROM profit_daily WHERE workspace_id=$1 AND date >= current_date - ($2::int - 1)
    GROUP BY date ORDER BY date`, [workspaceId, days]);
  return rows.map((r:any)=>({date:r.date,revenue:num(r.revenue),profit:num(r.profit),adSpend:num(r.ad_spend)}));
}
export async function getSkuProfitability(workspaceId: string, days = 30) {
  const { rows } = await query<any>(`SELECT pd.sku,pd.asin,COALESCE(MAX(p.title),'Unattributed advertising') title,
    SUM(pd.units) units, SUM(pd.product_revenue+pd.shipping_revenue+pd.promotional_rebates) revenue,
    SUM(pd.referral_fees+pd.fulfillment_fees+pd.storage_fees+pd.refund_admin_fees) amazon_fees,
    SUM(pd.ad_spend) ad_spend, SUM(pd.cogs+pd.inbound_freight+pd.customs+pd.prep_fees) cogs,
    SUM(pd.refunds) refunds, SUM(pd.net_profit) net_profit
    FROM profit_daily pd LEFT JOIN products p ON p.id=pd.product_id
    WHERE pd.workspace_id=$1 AND pd.date >= current_date - ($2::int - 1)
    GROUP BY pd.sku,pd.asin ORDER BY net_profit DESC`, [workspaceId, days]);
  return rows.map((r:any)=>{const revenue=num(r.revenue),netProfit=num(r.net_profit);return{
    sku:r.sku??'UNATTRIBUTED',asin:r.asin??'—',title:r.title,units:num(r.units),revenue,
    amazonFees:num(r.amazon_fees),adSpend:num(r.ad_spend),cogs:num(r.cogs),refunds:num(r.refunds),
    netProfit,marginPercent:revenue?netProfit/revenue*100:0};});
}
export async function listTable(table: 'orders'|'refunds'|'cogs_history'|'sync_runs'|'alerts'|'amazon_accounts', workspaceId: string) {
  const sql: Record<string,string> = {
    orders:`SELECT o.amazon_order_id,o.purchase_date,o.order_status,COALESCE(SUM(oi.quantity),0) units,COALESCE(SUM(oi.product_revenue),0) revenue FROM orders o JOIN amazon_accounts a ON a.id=o.amazon_account_id LEFT JOIN order_items oi ON oi.order_id=o.id WHERE a.workspace_id=$1 GROUP BY o.id ORDER BY o.purchase_date DESC LIMIT 50`,
    refunds:`SELECT r.*,p.sku,p.asin FROM refunds r LEFT JOIN products p ON p.id=r.product_id LEFT JOIN amazon_accounts a ON a.id=p.amazon_account_id WHERE a.workspace_id=$1 ORDER BY r.refunded_at DESC LIMIT 50`,
    cogs_history:`SELECT * FROM cogs_history WHERE workspace_id=$1 ORDER BY sku,effective_from DESC`,
    sync_runs:`SELECT * FROM sync_runs WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 50`,
    alerts:`SELECT * FROM alerts WHERE workspace_id=$1 ORDER BY acknowledged_at NULLS FIRST,created_at DESC LIMIT 50`,
    amazon_accounts:`SELECT a.*,ad.profile_id,ad.status ads_status FROM amazon_accounts a LEFT JOIN amazon_ad_accounts ad ON ad.amazon_account_id=a.id WHERE a.workspace_id=$1`
  };
  return (await query(sql[table], [workspaceId])).rows;
}
