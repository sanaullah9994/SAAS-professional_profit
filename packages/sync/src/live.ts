import {
  AccessTokenProvider,
  SpApiClient,
  decrypt,
  getAmazonConfig,
  iterateInventorySummaries,
  iterateOrders,
  productFromInventorySummary,
  productFromOrderItem,
  type AmazonRegion,
  type InventorySummary,
  type Order,
  type OrderItem,
  type ProductSnapshot,
} from '@amazon-profit/amazon';
import type { PoolClient } from 'pg';
import { query, transaction } from '@amazon-profit/db';
import type { SyncJobData } from '@amazon-profit/types';
import { getDateRange } from '@amazon-profit/utils';
import { rebuildProfitDaily } from './profit.js';

type AccountRow = {
  id: string;
  workspace_id: string;
  seller_id: string;
  marketplace_id: string;
  region: string;
  provider_mode: string;
  sp_refresh_token_encrypted: string | null;
};

type SyncJobLike = { data: SyncJobData };

const MIN_LAST_UPDATED_BEFORE_OFFSET_MS = 2 * 60 * 1000;
const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;
const ERROR_MESSAGE_MAX = 4000;

function toRegion(value: string): AmazonRegion {
  return value === 'EU' || value === 'FE' ? value : 'NA';
}

function toAmount(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function itemRevenue(item: OrderItem): { productRevenue: number; shippingRevenue: number; promotionalRebates: number } {
  let productRevenue = 0;
  let shippingRevenue = 0;
  let promotionalRebates = 0;
  for (const breakdown of item.proceeds?.breakdowns ?? []) {
    const amount = toAmount(breakdown.subtotal?.amount);
    if (breakdown.type === 'ITEM') productRevenue += amount;
    else if (breakdown.type === 'SHIPPING') shippingRevenue += amount;
    else if (breakdown.type === 'DISCOUNT') promotionalRebates += amount;
  }
  return { productRevenue, shippingRevenue, promotionalRebates };
}

function orderCurrency(order: Order): string {
  const candidates = [
    order.proceeds?.grandTotal?.currencyCode,
    order.proceeds?.proceedsTotal?.currencyCode,
    ...((order.proceeds?.breakdowns ?? []).map((b) => b.subtotal?.currencyCode) ?? []),
    ...((order.orderItems ?? []).flatMap((item) => (item.proceeds?.breakdowns ?? []).map((b) => b.subtotal?.currencyCode) ?? [])),
  ];
  return candidates.find((code) => typeof code === 'string' && code.length === 3)?.toUpperCase() ?? 'USD';
}

async function upsertProduct(client: PoolClient, accountId: string, product: ProductSnapshot): Promise<string> {
  const result = await client.query<{ id: string }>(
    `INSERT INTO products(amazon_account_id, sku, asin, title)
     VALUES($1, $2, $3, $4)
     ON CONFLICT (amazon_account_id, sku) DO UPDATE SET
       asin = EXCLUDED.asin,
       title = CASE WHEN EXCLUDED.title <> '' THEN EXCLUDED.title ELSE products.title END,
       updated_at = now()
     RETURNING id::text`,
    [accountId, product.sku, product.asin, product.title],
  );
  return result.rows[0]!.id;
}

async function persistOrder(accountId: string, order: Order): Promise<number> {
  let records = 0;
  await transaction(async (c) => {
    const status = order.fulfillment?.fulfillmentStatus ?? 'Unknown';
    const orderResult = await c.query<{ id: string }>(
      `INSERT INTO orders(amazon_account_id, amazon_order_id, purchase_date, order_status, marketplace_id, currency, raw_payload)
       VALUES($1, $2, $3, $4, $5, $6, $7::jsonb)
       ON CONFLICT (amazon_account_id, amazon_order_id) DO UPDATE SET
         purchase_date = EXCLUDED.purchase_date,
         order_status = EXCLUDED.order_status,
         marketplace_id = EXCLUDED.marketplace_id,
         currency = EXCLUDED.currency,
         raw_payload = EXCLUDED.raw_payload,
         updated_at = now()
       RETURNING id::text`,
      [accountId, order.orderId, order.createdTime, status, order.salesChannel?.marketplaceId ?? '', orderCurrency(order), JSON.stringify(order)],
    );
    const orderId = orderResult.rows[0]!.id;
    records++;

    for (const item of order.orderItems ?? []) {
      const product = productFromOrderItem(item);
      if (!product) continue;
      const productId = await upsertProduct(c, accountId, product);
      const revenue = itemRevenue(item);
      await c.query(
        `INSERT INTO order_items(order_id, product_id, amazon_order_item_id, sku, asin, quantity, product_revenue, shipping_revenue, promotional_rebates)
         VALUES($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (order_id, amazon_order_item_id) DO UPDATE SET
           product_id = EXCLUDED.product_id,
           sku = EXCLUDED.sku,
           asin = EXCLUDED.asin,
           quantity = EXCLUDED.quantity,
           product_revenue = EXCLUDED.product_revenue,
           shipping_revenue = EXCLUDED.shipping_revenue,
           promotional_rebates = EXCLUDED.promotional_rebates`,
        [orderId, productId, item.orderItemId, product.sku, product.asin, item.quantityOrdered, revenue.productRevenue, revenue.shippingRevenue, revenue.promotionalRebates],
      );
      records++;
    }
  });
  return records;
}

function inventoryQuantities(summary: InventorySummary): { sellable: number; reserved: number; pending: number; unsellable: number } {
  const details = summary.inventoryDetails;
  const inbound =
    (details?.inboundWorkingQuantity ?? 0) + (details?.inboundShippedQuantity ?? 0) + (details?.inboundReceivingQuantity ?? 0);
  return {
    sellable: details?.fulfillableQuantity ?? 0,
    reserved: details?.reservedQuantity?.totalReservedQuantity ?? 0,
    pending: inbound,
    unsellable: details?.unfulfillableQuantity?.totalUnfulfillableQuantity ?? 0,
  };
}

async function persistInventory(accountId: string, summary: InventorySummary): Promise<number> {
  const product = productFromInventorySummary(summary);
  if (!product) return 0;
  const quantities = inventoryQuantities(summary);
  let records = 0;
  await transaction(async (c) => {
    const productId = await upsertProduct(c, accountId, product);
    await c.query(
      `INSERT INTO fba_inventory_snapshots(product_id, date, sellable, reserved, pending, unsellable)
       VALUES($1::uuid, current_date, $2, $3, $4, $5)
       ON CONFLICT (product_id, date) DO UPDATE SET
         sellable = EXCLUDED.sellable,
         reserved = EXCLUDED.reserved,
         pending = EXCLUDED.pending,
         unsellable = EXCLUDED.unsellable`,
      [productId, quantities.sellable, quantities.reserved, quantities.pending, quantities.unsellable],
    );
    records++;
  });
  return records;
}

function searchOrderWindow(from: string, to: string): { lastUpdatedAfter: string; lastUpdatedBefore: string } {
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  const cutoff = Date.now() - MIN_LAST_UPDATED_BEFORE_OFFSET_MS;
  const latest = Math.min(Number.isFinite(toMs) ? toMs : cutoff, cutoff);
  const earliest = Math.max(Number.isFinite(fromMs) ? fromMs : Date.now() - TWO_YEARS_MS, Date.now() - TWO_YEARS_MS);
  const before = Math.max(latest, earliest + 1000);
  return {
    lastUpdatedAfter: new Date(earliest).toISOString(),
    lastUpdatedBefore: new Date(before).toISOString(),
  };
}

export async function syncLiveAccount(job: SyncJobLike): Promise<{ run?: string; records: number; skipped?: string }> {
  const accountId = job.data.amazonAccountId ?? process.env.MOCK_AMAZON_ACCOUNT_ID!;
  const workspaceId = job.data.workspaceId ?? process.env.MOCK_WORKSPACE_ID!;
  const range = getDateRange(Number(process.env.INITIAL_SYNC_DAYS ?? 90));
  const from = job.data.from ?? range.from;
  const to = job.data.to ?? range.to;

  const account = (
    await query<AccountRow>(
      `SELECT id, workspace_id, seller_id, marketplace_id, region, provider_mode, sp_refresh_token_encrypted
       FROM amazon_accounts WHERE id = $1`,
      [accountId],
    )
  ).rows[0];
  if (!account) throw new Error(`Amazon account ${accountId} was not found.`);
  if (!account.sp_refresh_token_encrypted) {
    throw new Error('Amazon account has no stored refresh token. Reconnect the account through the Connections page.');
  }

  const inProgress = (
    await query<{ id: string }>(
      `SELECT id FROM sync_runs
       WHERE amazon_account_id = $1 AND status = 'running' AND started_at > now() - interval '2 hours'
       LIMIT 1`,
      [accountId],
    )
  ).rows[0];
  if (inProgress) return { records: 0, skipped: 'already_running' };

  const run = (
    await query<{ id: string }>(
      `INSERT INTO sync_runs(amazon_account_id, workspace_id, trigger, status, from_date, to_date, started_at)
       VALUES($1, $2, $3, 'running', $4, $5, now()) RETURNING id::text`,
      [accountId, workspaceId, job.data.trigger, from, to],
    )
  ).rows[0]!.id;

  try {
    const config = getAmazonConfig();
    const refreshToken = decrypt(account.sp_refresh_token_encrypted, config.encryptionKey);
    const tokenProvider = new AccessTokenProvider(
      { clientId: config.lwaClientId, clientSecret: config.lwaClientSecret },
      refreshToken,
    );
    const client = new SpApiClient({
      region: toRegion(account.region),
      getAccessToken: () => tokenProvider.getAccessToken(),
      invalidateAccessToken: () => tokenProvider.invalidate(),
    });

    let records = 0;
    const window = searchOrderWindow(from, to);
    for await (const order of iterateOrders(client, {
      marketplaceIds: [account.marketplace_id],
      lastUpdatedAfter: window.lastUpdatedAfter,
      lastUpdatedBefore: window.lastUpdatedBefore,
      maxResultsPerPage: 100,
      includedData: ['FULFILLMENT', 'PROCEEDS'],
    })) {
      records += await persistOrder(accountId, order);
    }
    for await (const summary of iterateInventorySummaries(client, { marketplaceIds: [account.marketplace_id] })) {
      records += await persistInventory(accountId, summary);
    }
    const profit = await rebuildProfitDaily(accountId, workspaceId, from, to);
    records += profit.rows;

    await query(`UPDATE amazon_accounts SET last_synced_at = now(), updated_at = now() WHERE id = $1`, [accountId]);
    await query(`UPDATE sync_runs SET status = 'completed', records_processed = $2, completed_at = now() WHERE id = $1`, [run, records]);
    return { run, records };
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).slice(0, ERROR_MESSAGE_MAX);
    await query(`UPDATE sync_runs SET status = 'failed', error_message = $2, completed_at = now() WHERE id = $1`, [run, message]);
    throw error;
  }
}
