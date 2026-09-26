export type DashboardOverviewResponse={
  summary:{revenue:number;profit:number;adSpend:number;refunds:number;units:number;cogs:number;marginPercent:number;tacosPercent:number;roiPercent:number};
  trend:{date:string;revenue:number;profit:number;adSpend:number}[];
  expenses:{total:number;items:{name:string;amount:number;pct:number}[]};
  products:{sku:string;asin:string;title:string;units:number;revenue:number;amazonFees:number;adSpend:number;cogs:number;refunds:number;netProfit:number;marginPercent:number}[];
  period:number;
};
export type ProfitCalculatorRow={id:string;sku:string;asin:string;title:string;units:number;revenue:number;avgPrice:number;fbaFee:number;referralPct:number;referralAmt:number;cogsPerUnit:number;storageFeePerUnit:number;refundRate:number;marketingPct:number;profit:number;marginPct:number};
export type TrafficRawRow={productId:string;sku:string;asin:string;title:string;date:string;units:number;revenue:number;adSpend:number;organicSessions:number;paidSessions:number};

// The workspace is never supplied by the client: API routes resolve it from the
// authenticated session (see lib/workspace.ts).
async function getReal<T>(path:string):Promise<T|null>{
  try{
    const r=await fetch(path,{cache:'no-store'});
    return r.ok?((await r.json()) as T):null;
  }catch{return null;}
}

export const fetchDashboardOverview=(days:number)=>getReal<DashboardOverviewResponse>(`/api/v1/dashboard/overview?days=${days}`);
export const fetchProfitCalculator=(days:number)=>getReal<ProfitCalculatorRow[]>(`/api/v1/profit/calculator?days=${days}`);
export const fetchTrafficRaw=(days:number)=>getReal<TrafficRawRow[]>(`/api/v1/traffic/raw?days=${days}`);

export type ProductRow={id:string;title:string;sku:string;asin:string;active:boolean;cogs:number};
export type InventoryRow={id:string;name:string;sku:string;code:string;child:string;sellable:number;reserved:number;pending:number;unsellable:number;value:number;sold30:number;daysCoverage:number;daily:{date:string;units:number;stock:number}[]};
export type PerformanceDailyRow={date:string;spend:number;sales:number;conv:number;ctr:number;acos:number;cpc:number};
export type PerformanceMonthlyRow={month:string;salesPpc:number;salesOrg:number;profitPpc:number;profitOrg:number};
export type AccountRow={id:string;display_name:string;marketplace_id:string;status:string;provider_mode:string;profile_id:string|null;ads_status:string|null};

export const fetchProducts=()=>getReal<ProductRow[]>('/api/v1/products');
export const fetchInventory=()=>getReal<InventoryRow[]>('/api/v1/inventory');
export const fetchPerformance=(days:number,code?:string)=>getReal<{daily:PerformanceDailyRow[];monthly:PerformanceMonthlyRow[];codes:string[]}>(`/api/v1/performance?days=${days}${code?`&code=${encodeURIComponent(code)}`:''}`);
export const fetchAccounts=()=>getReal<AccountRow[]>('/api/v1/amazon/connections');

export async function setProductActive(id:string,active:boolean):Promise<boolean>{
  try{
    const r=await fetch('/api/v1/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,active})});
    return r.ok;
  }catch{return false;}
}
export async function saveCogs(sku:string,unitCogs:number):Promise<boolean>{
  try{
    const r=await fetch('/api/v1/cogs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sku,effectiveFrom:new Date().toISOString().slice(0,10),unitCogs})});
    return r.ok;
  }catch{return false;}
}

export type EmailCheck={exists:boolean;providers:string[]};
export async function checkEmail(email:string):Promise<EmailCheck>{
  try{
    const r=await fetch(`/api/v1/auth/check-email?email=${encodeURIComponent(email)}`,{cache:'no-store'});
    return r.ok?((await r.json()) as EmailCheck):{exists:false,providers:[]};
  }catch{return{exists:false,providers:[]};}
}
