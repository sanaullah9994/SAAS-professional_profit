export type AmazonRegion = 'NA' | 'EU' | 'FE';

export const US_MARKETPLACE_ID = 'ATVPDKIKX0DER';

export const SP_API_ENDPOINTS: Record<AmazonRegion, string> = {
  NA: 'https://sellingpartnerapi-na.amazon.com',
  EU: 'https://sellingpartnerapi-eu.amazon.com',
  FE: 'https://sellingpartnerapi-fe.amazon.com',
};

export interface MarketplaceDefinition {
  id: string;
  region: AmazonRegion;
  sellerCentralBaseUrl: string;
  label: string;
}

export const MARKETPLACES: Record<string, MarketplaceDefinition> = {
  ATVPDKIKX0DER: { id: 'ATVPDKIKX0DER', region: 'NA', sellerCentralBaseUrl: 'https://sellercentral.amazon.com', label: 'Amazon US' },
  A1AM7LIF74PPAT: { id: 'A1AM7LIF74PPAT', region: 'NA', sellerCentralBaseUrl: 'https://sellercentral.amazon.ca', label: 'Amazon CA' },
  A1RKKUPIHCS9HS: { id: 'A1RKKUPIHCS9HS', region: 'NA', sellerCentralBaseUrl: 'https://sellercentral.amazon.com.mx', label: 'Amazon MX' },
  A1F83G8C2ARO7P: { id: 'A1F83G8C2ARO7P', region: 'EU', sellerCentralBaseUrl: 'https://sellercentral-europe.amazon.com', label: 'Amazon UK' },
  A1PA6795UKMFR9: { id: 'A1PA6795UKMFR9', region: 'EU', sellerCentralBaseUrl: 'https://sellercentral-europe.amazon.com', label: 'Amazon DE' },
  A13V1IB3VIYZZH: { id: 'A13V1IB3VIYZZH', region: 'EU', sellerCentralBaseUrl: 'https://sellercentral-europe.amazon.com', label: 'Amazon FR' },
  APJ6JRA9NG5K4: { id: 'APJ6JRA9NG5K4', region: 'FE', sellerCentralBaseUrl: 'https://sellercentral.amazon.co.jp', label: 'Amazon JP' },
  A2Q3Y263D00KWC: { id: 'A2Q3Y263D00KWC', region: 'FE', sellerCentralBaseUrl: 'https://sellercentral.amazon.com.au', label: 'Amazon AU' },
};

export function resolveMarketplace(marketplaceId: string): MarketplaceDefinition {
  const known = MARKETPLACES[marketplaceId];
  if (known) return known;
  const region = (process.env.AMAZON_REGION as AmazonRegion | undefined) ?? 'NA';
  const safeRegion: AmazonRegion = region === 'EU' || region === 'FE' ? region : 'NA';
  return {
    id: marketplaceId,
    region: safeRegion,
    sellerCentralBaseUrl: safeRegion === 'EU' ? 'https://sellercentral-europe.amazon.com' : safeRegion === 'FE' ? 'https://sellercentral.amazon.co.jp' : 'https://sellercentral.amazon.com',
    label: marketplaceId,
  };
}

export function spApiEndpoint(region: AmazonRegion): string {
  return SP_API_ENDPOINTS[region];
}

export function marketplaceLabel(marketplaceId: string): string {
  return MARKETPLACES[marketplaceId]?.label ?? marketplaceId;
}
