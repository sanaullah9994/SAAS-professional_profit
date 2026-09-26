import type { InventorySummary, OrderItem } from '../types/spapi.js';

export interface ProductSnapshot {
  sku: string;
  asin: string;
  title: string;
}

export function productFromOrderItem(item: OrderItem): ProductSnapshot | null {
  const sku = item.product?.sellerSku?.trim();
  const asin = item.product?.asin?.trim();
  if (!sku || !asin) return null;
  return { sku, asin, title: item.product.title?.trim() || sku };
}

export function productFromInventorySummary(summary: InventorySummary): ProductSnapshot | null {
  const sku = summary.sellerSku?.trim();
  const asin = summary.asin?.trim();
  if (!sku || !asin) return null;
  return { sku, asin, title: sku };
}
