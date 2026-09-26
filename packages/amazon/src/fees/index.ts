import { AmazonNotImplementedError } from '../errors.js';

export interface AmazonFeeRecord {
  orderId?: string;
  orderItemId?: string;
  sku?: string;
  feeType: string;
  amount: number;
  currencyCode?: string;
  postedAt: string;
}

export interface FeeSyncRange {
  from: string;
  to: string;
}

export async function fetchFees(_range: FeeSyncRange): Promise<AmazonFeeRecord[]> {
  throw new AmazonNotImplementedError(
    'Fees and financial-event synchronization is planned future production integration work (FBA Sales and Events / Settlement reports).',
  );
}
