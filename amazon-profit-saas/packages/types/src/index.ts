export type OrganizationRole = 'owner' | 'admin' | 'analyst';
export type SyncTrigger = 'manual' | 'scheduled' | 'initial';
export type SyncStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface ProfitComponents {
  productRevenue: number;
  shippingRevenue: number;
  promotionalRebates: number;
  referralFees: number;
  fulfillmentFees: number;
  storageFees: number;
  refunds: number;
  refundAdminFees: number;
  adSpend: number;
  cogs: number;
  inboundFreight: number;
  customs: number;
  prepFees: number;
  otherOperatingCosts: number;
}
export interface ProfitResult extends ProfitComponents {
  grossRevenue: number;
  amazonCosts: number;
  landedProductCosts: number;
  netProfit: number;
  marginPercent: number;
}
export interface ProfitTrendPoint {
  date: string;
  revenue: number;
  profit: number;
  adSpend: number;
}
export interface SkuProfitabilityRow {
  sku: string;
  asin: string;
  title: string;
  units: number;
  revenue: number;
  amazonFees: number;
  adSpend: number;
  cogs: number;
  refunds: number;
  netProfit: number;
  marginPercent: number;
}
export interface SyncJobData {
  amazonAccountId?: string;
  workspaceId?: string;
  from?: string;
  to?: string;
  trigger: SyncTrigger;
}
