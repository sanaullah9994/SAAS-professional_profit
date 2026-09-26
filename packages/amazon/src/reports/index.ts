import { AmazonNotImplementedError } from '../errors.js';

export type AmazonReportType =
  | 'GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL'
  | 'GET_AMAZON_FULFILLED_SHIPMENTS_DATA_GENERAL'
  | 'GET_FBA_FULFILLMENT_INVENTORY_QUANTITY_DATA'
  | 'GET_SALES_AND_TRAFFIC_REPORT';

export interface AmazonReportRequest {
  reportType: AmazonReportType;
  fromDate?: string;
  toDate?: string;
}

export interface AmazonReportDocument {
  reportType: AmazonReportType;
  documentId: string;
}

export async function requestReport(_request: AmazonReportRequest): Promise<AmazonReportDocument> {
  throw new AmazonNotImplementedError(
    'Reports, refunds, traffic and business-report synchronization is planned future production integration work.',
  );
}
