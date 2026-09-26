import './env.js';
import pg, { type PoolClient, type QueryResultRow } from 'pg';
const { Pool } = pg;
const connectionString = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/amazon_profit';
export const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'true' || connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
  idleTimeoutMillis: 30_000,
});
// Without a listener here, an idle pooled connection dropped by the server (e.g. Neon's
// serverless compute recycling connections) throws an uncaught exception that crashes the process.
pool.on('error', (err) => {
  console.error('[db] idle client error', err);
});

const isRetryableConnectionError = (err: unknown) =>
  err instanceof Error && /Connection terminated|ECONNRESET|ETIMEDOUT|connection closed|server closed the connection/i.test(err.message);

export const query = async <T extends QueryResultRow = QueryResultRow>(text: string, params: readonly unknown[] = []) => {
  try {
    return await pool.query<T>(text, [...params]);
  } catch (err) {
    // A burst of concurrent queries against a cold pool (no warm connections after an idle
    // period) occasionally fails to establish a new connection to the DB on the first attempt.
    // One immediate retry reuses whichever connections the burst already opened and succeeds.
    if (!isRetryableConnectionError(err)) throw err;
    return await pool.query<T>(text, [...params]);
  }
};
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
    COALESCE(SUM(refunds),0) refunds, COALESCE(SUM(units),0) units,
    COALESCE(SUM(cogs+inbound_freight+customs+prep_fees),0) cogs
    FROM profit_daily WHERE workspace_id=$1 AND date >= current_date - ($2::int - 1)`, [workspaceId, days]);
  const r = rows[0] ?? {}; const revenue = num(r.revenue); const profit = num(r.profit); const adSpend = num(r.ad_spend); const cogs = num(r.cogs);
  return { revenue, profit, adSpend, refunds:num(r.refunds), units:num(r.units), cogs, marginPercent:revenue?profit/revenue*100:0, tacosPercent:revenue?adSpend/revenue*100:0, roiPercent:cogs?profit/cogs*100:0 };
}
export async function getExpenseBreakdown(workspaceId: string, days = 30) {
  const { rows } = await query<any>(`SELECT
    COALESCE(SUM(cogs+inbound_freight+customs+prep_fees),0) cogs,
    COALESCE(SUM(referral_fees),0) referral, COALESCE(SUM(fulfillment_fees),0) fulfillment,
    COALESCE(SUM(ad_spend),0) advertising, COALESCE(SUM(storage_fees),0) storage,
    COALESCE(SUM(refunds+refund_admin_fees),0) refunds, COALESCE(SUM(promotional_rebates),0) discounts
    FROM profit_daily WHERE workspace_id=$1 AND date >= current_date - ($2::int - 1)`, [workspaceId, days]);
  const r = rows[0] ?? {};
  const categories = [
    ['Cost of Goods', num(r.cogs)], ['Referral Fee', num(r.referral)], ['Advertising', num(r.advertising)],
    ['Fulfillment Fees', num(r.fulfillment)], ['Storage Fees', num(r.storage)], ['Refunds', num(r.refunds)],
    ['Discounts', num(r.discounts)],
  ] as const;
  const total = categories.reduce((a, [, v]) => a + v, 0);
  return { total, items: categories.map(([name, amount]) => ({ name, amount, pct: total ? (amount / total) * 100 : 0 })) };
}
export async function getProductEconomics(workspaceId: string, days = 30) {
  const { rows } = await query<any>(`SELECT p.id,p.sku,p.asin,p.title,
    COALESCE(SUM(pd.units),0) units, COALESCE(SUM(pd.product_revenue),0) revenue,
    COALESCE(SUM(pd.referral_fees),0) referral_fees, COALESCE(SUM(pd.fulfillment_fees),0) fulfillment_fees,
    COALESCE(SUM(pd.storage_fees),0) storage_fees, COALESCE(SUM(pd.refunds),0) refunds,
    COALESCE(SUM(pd.ad_spend),0) ad_spend, COALESCE(SUM(pd.cogs),0) cogs, COALESCE(SUM(pd.net_profit),0) net_profit
    FROM products p JOIN amazon_accounts a ON a.id=p.amazon_account_id
    LEFT JOIN profit_daily pd ON pd.product_id=p.id AND pd.date >= current_date - ($2::int - 1)
    WHERE a.workspace_id=$1 GROUP BY p.id,p.sku,p.asin,p.title ORDER BY SUM(pd.product_revenue) DESC NULLS LAST`, [workspaceId, days]);
  return rows.map((r: any) => {
    const units = num(r.units), revenue = num(r.revenue), netProfit = num(r.net_profit);
    return {
      id: r.id, sku: r.sku, asin: r.asin, title: r.title, units, revenue,
      avgPrice: units ? revenue / units : 0,
      fbaFee: units ? num(r.fulfillment_fees) / units : 0,
      referralPct: revenue ? num(r.referral_fees) / revenue * 100 : 0,
      referralAmt: units ? num(r.referral_fees) / units : 0,
      cogsPerUnit: units ? num(r.cogs) / units : 0,
      storageFeePerUnit: units ? num(r.storage_fees) / units : 0,
      refundRate: revenue ? num(r.refunds) / revenue * 100 : 0,
      marketingPct: revenue ? num(r.ad_spend) / revenue * 100 : 0,
      profit: netProfit, marginPct: revenue ? netProfit / revenue * 100 : 0,
    };
  });
}
export async function getTrafficRaw(workspaceId: string, days = 30) {
  const { rows } = await query<any>(`SELECT p.id product_id,p.sku,p.asin,p.title,d.date::text date,
    COALESCE(pd.units,0) units, COALESCE(pd.product_revenue,0) revenue, COALESCE(pd.ad_spend,0) ad_spend,
    COALESCE(td.organic_sessions,0) organic_sessions, COALESCE(td.paid_sessions,0) paid_sessions
    FROM products p
    JOIN amazon_accounts a ON a.id=p.amazon_account_id
    CROSS JOIN generate_series(current_date-($2::int-1),current_date,interval '1 day') d(date)
    LEFT JOIN profit_daily pd ON pd.product_id=p.id AND pd.date=d.date
    LEFT JOIN traffic_daily td ON td.product_id=p.id AND td.date=d.date
    WHERE a.workspace_id=$1 ORDER BY p.id,d.date`, [workspaceId, days]);
  return rows.map((r: any) => ({
    productId: r.product_id, sku: r.sku, asin: r.asin, title: r.title, date: r.date,
    units: num(r.units), revenue: num(r.revenue), adSpend: num(r.ad_spend),
    organicSessions: num(r.organic_sessions), paidSessions: num(r.paid_sessions),
  }));
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
export async function getPpcCampaigns(workspaceId: string, days = 30) {
  const { rows } = await query<any>(`SELECT a.campaign_id,a.campaign_name,a.campaign_type,
    COALESCE(SUM(a.spend),0) spend, COALESCE(SUM(a.attributed_sales),0) sales
    FROM ad_spend_daily a JOIN amazon_accounts acc ON acc.id=a.amazon_account_id
    WHERE acc.workspace_id=$1 AND a.campaign_id<>'CMP-UNATTR' AND a.date>=current_date-($2::int-1)
    GROUP BY a.campaign_id,a.campaign_name,a.campaign_type ORDER BY SUM(a.spend) DESC`, [workspaceId, days]);
  return rows.map((r: any) => {
    const spend = num(r.spend), sales = num(r.sales);
    return { campaign: r.campaign_name, type: r.campaign_type, spend, sales, acosPercent: sales ? (spend / sales) * 100 : 0, roas: spend ? sales / spend : 0 };
  });
}

// Product Code shown on Inventory/Performance is derived from the SKU itself (2nd hyphen
// segment, e.g. "CP-ABS-BLK-2436" -> "ABS") — there's no separate product-code concept in
// the schema, and with only 5 demo SKUs a real grouping table would be overkill.
const skuCode = (sku: string) => sku.split('-')[1] ?? sku;

export async function getInventory(workspaceId: string) {
  const { rows } = await query<any>(`SELECT p.id,p.sku,p.asin,p.title,
    s.date::text date, s.sellable, s.reserved, s.pending, s.unsellable,
    COALESCE(pd.units,0) units, COALESCE(ch.unit_cogs,0) unit_cogs
    FROM products p
    JOIN amazon_accounts a ON a.id=p.amazon_account_id
    LEFT JOIN fba_inventory_snapshots s ON s.product_id=p.id AND s.date>=current_date-29
    LEFT JOIN profit_daily pd ON pd.product_id=p.id AND pd.date=s.date
    LEFT JOIN cogs_history ch ON ch.workspace_id=a.workspace_id AND ch.sku=p.sku
    WHERE a.workspace_id=$1 ORDER BY p.sku,s.date`, [workspaceId]);

  const byProduct = new Map<string, any>();
  for (const r of rows) {
    let p = byProduct.get(r.id);
    if (!p) {
      p = { id: r.id, name: r.title, sku: r.sku, child: r.asin, code: skuCode(r.sku), unitCogs: num(r.unit_cogs), daily: [] as { date: string; units: number; stock: number }[] };
      byProduct.set(r.id, p);
    }
    if (r.date) p.daily.push({ date: r.date, units: num(r.units), stock: num(r.sellable) });
    if (r.date) p.latest = { sellable: num(r.sellable), reserved: num(r.reserved), pending: num(r.pending), unsellable: num(r.unsellable) };
  }
  return Array.from(byProduct.values()).map((p) => {
    const latest = p.latest ?? { sellable: 0, reserved: 0, pending: 0, unsellable: 0 };
    const sold30 = p.daily.reduce((a: number, d: any) => a + d.units, 0);
    const dailyAvg = sold30 / 30;
    const daysCoverage = dailyAvg > 0 ? Math.round((latest.sellable + latest.pending) / dailyAvg) : 999;
    return {
      id: p.id, name: p.name, sku: p.sku, code: p.code, child: p.child,
      sellable: latest.sellable, reserved: latest.reserved, pending: latest.pending, unsellable: latest.unsellable,
      value: Math.round(latest.sellable * p.unitCogs), sold30, daysCoverage, daily: p.daily,
    };
  });
}

export async function getPerformanceDaily(workspaceId: string, days = 90, code?: string) {
  const { rows } = await query<any>(`SELECT a.date::text date,
    COALESCE(SUM(a.spend),0) spend, COALESCE(SUM(a.attributed_sales),0) sales,
    COALESCE(SUM(a.impressions),0) impressions, COALESCE(SUM(a.clicks),0) clicks, COALESCE(SUM(a.attributed_orders),0) orders
    FROM ad_spend_daily a
    JOIN amazon_accounts acc ON acc.id=a.amazon_account_id
    LEFT JOIN products p ON p.id=a.product_id
    WHERE acc.workspace_id=$1 AND a.campaign_id<>'CMP-UNATTR' AND a.date>=current_date-($2::int-1)
      AND ($3::text IS NULL OR $3='All' OR split_part(p.sku,'-',2)=$3)
    GROUP BY a.date ORDER BY a.date`, [workspaceId, days, code && code !== 'All' ? code : null]);
  return rows.map((r: any) => {
    const spend = num(r.spend), sales = num(r.sales), clicks = num(r.clicks), impressions = num(r.impressions), orders = num(r.orders);
    return {
      date: r.date, spend, sales,
      conv: clicks ? (orders / clicks) * 100 : 0,
      ctr: impressions ? (clicks / impressions) * 100 : 0,
      acos: sales ? (spend / sales) * 100 : 0,
      cpc: clicks ? spend / clicks : 0,
    };
  });
}

export async function getPerformanceMonthly(workspaceId: string, code?: string) {
  const { rows } = await query<any>(`SELECT to_char(pd.date,'YYYY-MM') AS period,
    COALESCE(SUM(pd.product_revenue),0) revenue, COALESCE(SUM(pd.net_profit),0) profit
    FROM profit_daily pd
    LEFT JOIN products p ON p.id=pd.product_id
    WHERE pd.workspace_id=$1 AND pd.product_id IS NOT NULL
      AND ($2::text IS NULL OR $2='All' OR split_part(p.sku,'-',2)=$2)
    GROUP BY period ORDER BY period`, [workspaceId, code && code !== 'All' ? code : null]);
  const { rows: ppcRows } = await query<any>(`SELECT to_char(a.date,'YYYY-MM') AS period, COALESCE(SUM(a.attributed_sales),0) ppc_sales
    FROM ad_spend_daily a JOIN amazon_accounts acc ON acc.id=a.amazon_account_id LEFT JOIN products p ON p.id=a.product_id
    WHERE acc.workspace_id=$1 AND a.campaign_id<>'CMP-UNATTR'
      AND ($2::text IS NULL OR $2='All' OR split_part(p.sku,'-',2)=$2)
    GROUP BY period`, [workspaceId, code && code !== 'All' ? code : null]);
  const ppcByMonth = new Map(ppcRows.map((r: any) => [r.period, num(r.ppc_sales)]));
  return rows.map((r: any) => {
    const revenue = num(r.revenue), profit = num(r.profit);
    const ppcSales = Math.min(revenue, (ppcByMonth.get(r.period) as number) ?? 0);
    const orgSales = Math.max(0, revenue - ppcSales);
    const ppcProfit = revenue ? profit * (ppcSales / revenue) : 0;
    const orgProfit = profit - ppcProfit;
    return { month: r.period, salesPpc: ppcSales, salesOrg: orgSales, profitPpc: ppcProfit, profitOrg: orgProfit };
  });
}

export async function getSkuCodes(workspaceId: string) {
  const { rows } = await query<any>(
    `SELECT DISTINCT split_part(p.sku,'-',2) AS code
     FROM products p
     JOIN amazon_accounts a ON a.id=p.amazon_account_id
     WHERE a.workspace_id=$1 AND position('-' in p.sku) > 0
     ORDER BY 1`,
    [workspaceId]);
  return rows.map((r: any) => String(r.code ?? '')).filter((c: string) => c.length > 0);
}
export async function getProducts(workspaceId: string) {
  const { rows } = await query<any>(`SELECT p.id,p.sku,p.asin,p.title,p.active,
    COALESCE(ch.unit_cogs,0) unit_cogs
    FROM products p
    JOIN amazon_accounts a ON a.id=p.amazon_account_id
    LEFT JOIN LATERAL (SELECT unit_cogs FROM cogs_history WHERE workspace_id=a.workspace_id AND sku=p.sku ORDER BY effective_from DESC LIMIT 1) ch ON true
    WHERE a.workspace_id=$1 ORDER BY p.title`, [workspaceId]);
  return rows.map((r: any) => ({ id: r.id, title: r.title, sku: r.sku, asin: r.asin, active: r.active as boolean, cogs: num(r.unit_cogs) }));
}
export async function setProductActive(productId: string, active: boolean) {
  await query(`UPDATE products SET active=$2,updated_at=now() WHERE id=$1`, [productId, active]);
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
  return (await query(sql[table]!, [workspaceId])).rows;
}
