import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ProfitComponents, ProfitResult } from '@amazon-profit/types';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const formatCurrency = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
export const formatPercent = (value: number) => `${value.toFixed(1)}%`;

export function calculateProfit(input: ProfitComponents): ProfitResult {
  const grossRevenue = input.productRevenue + input.shippingRevenue + input.promotionalRebates;
  const amazonCosts =
    input.referralFees + input.fulfillmentFees + input.storageFees +
    input.refunds + input.refundAdminFees + input.adSpend;
  const landedProductCosts = input.cogs + input.inboundFreight + input.customs + input.prepFees;
  const netProfit = grossRevenue - amazonCosts - landedProductCosts - input.otherOperatingCosts;
  return {
    ...input,
    grossRevenue,
    amazonCosts,
    landedProductCosts,
    netProfit,
    marginPercent: grossRevenue === 0 ? 0 : (netProfit / grossRevenue) * 100,
  };
}

export function getDateRange(days: number) {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - Math.max(1, days));
  return { from: from.toISOString(), to: to.toISOString() };
}
