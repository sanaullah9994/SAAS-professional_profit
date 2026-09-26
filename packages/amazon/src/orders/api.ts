import type { SpApiClient, QueryValue } from '../client/http.js';
import type { Order, SearchOrdersResponse } from '../types/spapi.js';

export const SEARCH_ORDERS_PATH = '/orders/2026-01-01/orders';

export type IncludedDataValue =
  | 'BUYER'
  | 'RECIPIENT'
  | 'PROCEEDS'
  | 'EXPENSE'
  | 'PROMOTION'
  | 'CANCELLATION'
  | 'FULFILLMENT'
  | 'PACKAGES'
  | 'TAX'
  | 'PAYMENT'
  | 'FULFILLMENT_ORDERS';

export interface SearchOrdersInput {
  marketplaceIds: string[];
  lastUpdatedAfter?: string;
  lastUpdatedBefore?: string;
  createdAfter?: string;
  createdBefore?: string;
  maxResultsPerPage?: number;
  paginationToken?: string;
  includedData?: IncludedDataValue[];
}

function toQuery(input: SearchOrdersInput): Record<string, QueryValue> {
  const hasCreated = Boolean(input.createdAfter);
  const hasUpdated = Boolean(input.lastUpdatedAfter);
  if (hasCreated && hasUpdated) {
    throw new Error('searchOrders accepts exactly one of createdAfter or lastUpdatedAfter.');
  }
  if (!hasCreated && !hasUpdated) {
    throw new Error('searchOrders requires either createdAfter or lastUpdatedAfter.');
  }
  return {
    marketplaceIds: input.marketplaceIds.join(','),
    lastUpdatedAfter: input.lastUpdatedAfter,
    lastUpdatedBefore: input.lastUpdatedBefore,
    createdAfter: input.createdAfter,
    createdBefore: input.createdBefore,
    maxResultsPerPage: input.maxResultsPerPage,
    paginationToken: input.paginationToken,
    includedData: input.includedData?.join(','),
  };
}

export async function searchOrders(client: SpApiClient, input: SearchOrdersInput): Promise<SearchOrdersResponse> {
  return client.request<SearchOrdersResponse>('GET', SEARCH_ORDERS_PATH, toQuery(input));
}

export async function* iterateOrders(
  client: SpApiClient,
  input: SearchOrdersInput,
  options: { maxPages?: number } = {},
): AsyncGenerator<Order, void, undefined> {
  const maxPages = options.maxPages ?? 500;
  let paginationToken = input.paginationToken;
  for (let page = 0; page < maxPages; page++) {
    const response = await searchOrders(client, { ...input, paginationToken });
    for (const order of response.orders ?? []) yield order;
    paginationToken = response.pagination?.nextToken;
    if (!paginationToken) return;
  }
}
