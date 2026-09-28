import { query } from '@amazon-profit/db';
import { calculateProfit } from '@amazon-profit/utils';

type ProfitSaleRow = {
  product_id: string;
  sku: string;
  asin: string;
  sale_date: string;
  units: number;
  product_revenue: number;
  shipping_revenue: number;
  promotional_rebates: number;
};

type CogsRow = {
  sku: string;
  effective_from: string;
  unit_cogs: number;
  inbound_freight_per_unit: number;
  customs_per_unit: number;
  prep_fee_per_unit: number;
};

const SALE_SQL = `SELECT
    oi.product_id::text AS product_id,
    oi.sku,
    oi.asin,
    to_char(o.purchase_date AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS sale_date,
    COALESCE(SUM(oi.quantity), 0)::int AS units,
    COALESCE(SUM(oi.product_revenue), 0)::numeric AS product_revenue,
    COALESCE(SUM(oi.shipping_revenue), 0)::numeric AS shipping_revenue,
    COALESCE(SUM(oi.promotional_rebates), 0)::numeric AS promotional_rebates
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.amazon_account_id = $1
    AND oi.product_id IS NOT NULL
    AND o.purchase_date >= $2::timestamptz
    AND o.purchase_date < $3::timestamptz
  GROUP BY oi.product_id, oi.sku, oi.asin, to_char(o.purchase_date AT TIME ZONE 'UTC', 'YYYY-MM-DD')`;

const UPSERT_SQL = `INSERT INTO profit_daily(
    workspace_id, amazon_account_id, product_id, dimension_key, sku, asin, date, units,
    product_revenue, shipping_revenue, promotional_rebates,
    referral_fees, fulfillment_fees, storage_fees, refunds, refund_admin_fees,
    ad_spend, cogs, inbound_freight, customs, prep_fees, other_operating_costs,
    net_profit, calculated_at
  ) VALUES (
    $1, $2, $3::uuid, $3::text, $4, $5, $6::date, $7,
    $8, $9, $10,
    0, 0, 0, 0, 0,
    0, $11, $12, $13, $14, 0,
    $15, now()
  )
  ON CONFLICT (amazon_account_id, date, dimension_key) DO UPDATE SET
    units = EXCLUDED.units,
    product_revenue = EXCLUDED.product_revenue,
    shipping_revenue = EXCLUDED.shipping_revenue,
    promotional_rebates = EXCLUDED.promotional_rebates,
    referral_fees = 0,
    fulfillment_fees = 0,
    storage_fees = 0,
    refunds = 0,
    refund_admin_fees = 0,
    ad_spend = 0,
    cogs = EXCLUDED.cogs,
    inbound_freight = EXCLUDED.inbound_freight,
    customs = EXCLUDED.customs,
    prep_fees = EXCLUDED.prep_fees,
    other_operating_costs = 0,
    net_profit = EXCLUDED.net_profit,
    calculated_at = now()`;

function cogsFor(sku: string, date: string, bySku: Map<string, CogsRow[]>): CogsRow | undefined {
  const rows = bySku.get(sku);
  if (!rows) return undefined;
  let match: CogsRow | undefined;
  for (const row of rows) {
    if (row.effective_from <= date) match = row;
    else break;
  }
  return match;
}

export interface ProfitRebuildResult {
  rows: number;
  feesSynced: false;
}

export async function rebuildProfitDaily(
  accountId: string,
  workspaceId: string,
  from: string,
  to: string,
): Promise<ProfitRebuildResult> {
  const sales = (await query<ProfitSaleRow>(SALE_SQL, [accountId, from, to])).rows;
  if (sales.length === 0) return { rows: 0, feesSynced: false };

  const skus = Array.from(new Set(sales.map((row) => row.sku)));
  const cogsRows = (
    await query<CogsRow>(
      `SELECT sku,
              to_char(effective_from, 'YYYY-MM-DD') AS effective_from,
              COALESCE(unit_cogs, 0) AS unit_cogs,
              COALESCE(inbound_freight_per_unit, 0) AS inbound_freight_per_unit,
              COALESCE(customs_per_unit, 0) AS customs_per_unit,
              COALESCE(prep_fee_per_unit, 0) AS prep_fee_per_unit
         FROM cogs_history
        WHERE workspace_id = $1 AND sku = ANY($2::text[])
        ORDER BY sku, effective_from`,
      [workspaceId, skus],
    )
  ).rows;
  const bySku = new Map<string, CogsRow[]>();
  for (const row of cogsRows) {
    const list = bySku.get(row.sku);
    if (list) list.push(row);
    else bySku.set(row.sku, [row]);
  }

  let rows = 0;
  for (const sale of sales) {
    const cogs = cogsFor(sale.sku, sale.sale_date, bySku);
    const units = sale.units;
    const profit = calculateProfit({
      productRevenue: Number(sale.product_revenue),
      shippingRevenue: Number(sale.shipping_revenue),
      promotionalRebates: Number(sale.promotional_rebates),
      referralFees: 0,
      fulfillmentFees: 0,
      storageFees: 0,
      refunds: 0,
      refundAdminFees: 0,
      adSpend: 0,
      cogs: units * Number(cogs?.unit_cogs ?? 0),
      inboundFreight: units * Number(cogs?.inbound_freight_per_unit ?? 0),
      customs: units * Number(cogs?.customs_per_unit ?? 0),
      prepFees: units * Number(cogs?.prep_fee_per_unit ?? 0),
      otherOperatingCosts: 0,
    });
    await query(UPSERT_SQL, [
      workspaceId,
      accountId,
      sale.product_id,
      sale.sku,
      sale.asin,
      sale.sale_date,
      sale.units,
      Number(sale.product_revenue),
      Number(sale.shipping_revenue),
      Number(sale.promotional_rebates),
      round2(profit.cogs),
      round2(profit.inboundFreight),
      round2(profit.customs),
      round2(profit.prepFees),
      round2(profit.netProfit),
    ]);
    rows++;
  }
  return { rows, feesSynced: false };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
