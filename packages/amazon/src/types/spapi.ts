export interface Money {
  amount?: string;
  currencyCode?: string;
}

export interface ProceedsBreakdown {
  type?: string;
  subtotal?: Money;
  detailedBreakdowns?: Array<{ subtype?: string; value?: Money }>;
}

export interface OrderItemProceeds {
  proceedsTotal?: Money;
  breakdowns?: ProceedsBreakdown[];
}

export interface OrderItemProduct {
  asin?: string;
  sellerSku?: string;
  title?: string;
  price?: { unitPrice?: Money };
}

export interface OrderItemFulfillment {
  quantityFulfilled?: number;
  quantityUnfulfilled?: number;
}

export interface OrderItem {
  orderItemId: string;
  quantityOrdered: number;
  product: OrderItemProduct;
  proceeds?: OrderItemProceeds;
  fulfillment?: OrderItemFulfillment;
}

export interface OrderFulfillment {
  fulfillmentStatus?: string;
  fulfilledBy?: string;
  fulfillmentServiceLevel?: string;
}

export interface SalesChannel {
  marketplaceId?: string;
  marketplaceName?: string;
}

export interface Order {
  orderId: string;
  createdTime: string;
  lastUpdatedTime: string;
  salesChannel?: SalesChannel;
  fulfillment?: OrderFulfillment;
  proceeds?: OrderProceeds;
  orderItems: OrderItem[];
}

export interface OrderProceeds {
  grandTotal?: Money;
  proceedsTotal?: Money;
  breakdowns?: ProceedsBreakdown[];
}

export interface SearchOrdersResponse {
  orders: Order[];
  pagination?: { nextToken?: string };
  lastUpdatedBefore?: string;
}

export interface ReservedQuantity {
  totalReservedQuantity?: number;
  reservedCustomerOrders?: number;
  reservedFcProcessing?: number;
  reservedFulfillmentCenterOwed?: number;
}

export interface UnfulfillableQuantity {
  totalUnfulfillableQuantity?: number;
  customerDamaged?: number;
  warehouseDamaged?: number;
  distributorDamaged?: number;
  carrierDamaged?: number;
  defective?: number;
  expired?: number;
}

export interface InventoryDetails {
  fulfillableQuantity?: number;
  inboundWorkingQuantity?: number;
  inboundShippedQuantity?: number;
  inboundReceivingQuantity?: number;
  reservedQuantity?: ReservedQuantity;
  unfulfillableQuantity?: UnfulfillableQuantity;
}

export interface InventorySummary {
  asin?: string;
  fnSku?: string;
  sellerSku?: string;
  condition?: string;
  inventoryDetails?: InventoryDetails;
  lastUpdatedTime?: string;
  totalQuantity?: number;
}

export interface GetInventorySummariesResponse {
  payload?: {
    granularity?: { granularityType?: string; granularityId?: string };
    inventorySummaries?: InventorySummary[];
  };
  pagination?: { nextToken?: string };
  errors?: Array<{ code: string; message?: string; details?: string }>;
}
