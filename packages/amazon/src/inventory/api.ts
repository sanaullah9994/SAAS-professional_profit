import type { SpApiClient, QueryValue } from '../client/http.js';
import type { GetInventorySummariesResponse, InventorySummary } from '../types/spapi.js';

export const INVENTORY_SUMMARIES_PATH = '/fba/inventory/v1/summaries';

export interface GetInventorySummariesInput {
  marketplaceIds: string[];
  startDateTime?: string;
  sellerSkus?: string[];
  sellerSku?: string;
  nextToken?: string;
  granularityType?: string;
  granularityId?: string;
}

function toQuery(input: GetInventorySummariesInput): Record<string, QueryValue> {
  if (input.marketplaceIds.length === 0) {
    throw new Error('getInventorySummaries requires at least one marketplace id.');
  }
  return {
    marketplaceIds: input.marketplaceIds.join(','),
    startDateTime: input.startDateTime,
    sellerSkus: input.sellerSkus?.join(','),
    sellerSku: input.sellerSku,
    nextToken: input.nextToken,
    granularityType: input.granularityType,
    granularityId: input.granularityId,
  };
}

export async function getInventorySummaries(client: SpApiClient, input: GetInventorySummariesInput): Promise<GetInventorySummariesResponse> {
  return client.request<GetInventorySummariesResponse>('GET', INVENTORY_SUMMARIES_PATH, toQuery(input));
}

export async function* iterateInventorySummaries(
  client: SpApiClient,
  input: GetInventorySummariesInput,
  options: { maxPages?: number } = {},
): AsyncGenerator<InventorySummary, void, undefined> {
  const maxPages = options.maxPages ?? 500;
  let nextToken = input.nextToken;
  for (let page = 0; page < maxPages; page++) {
    const response = await getInventorySummaries(client, { ...input, nextToken });
    for (const summary of response.payload?.inventorySummaries ?? []) yield summary;
    nextToken = response.pagination?.nextToken;
    if (!nextToken) return;
  }
}
