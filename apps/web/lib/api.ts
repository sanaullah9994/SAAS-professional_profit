import {summary,trend,skus} from './mock';
const API=process.env.NEXT_PUBLIC_API_URL??'http://localhost:4000';
async function safe<T>(path:string,fallback:T){try{const r=await fetch(API+path,{next:{revalidate:60}});return r.ok?await r.json() as T:fallback}catch{return fallback}}
export const overviewData=()=>safe('/v1/dashboard/overview?days=30',{summary,trend,period:30});
export const skuData=()=>safe('/v1/profit/skus?days=30',skus);

// Seeded "Commercial Plastics" demo workspace — see packages/db/migrations/0002_traffic_and_demo_seed.sql
const DEMO_WORKSPACE_ID='00000000-0000-0000-0000-000000000302';

export type DashboardOverviewResponse={
  summary:{revenue:number;profit:number;adSpend:number;refunds:number;units:number;cogs:number;marginPercent:number;tacosPercent:number;roiPercent:number};
  trend:{date:string;revenue:number;profit:number;adSpend:number}[];
  expenses:{total:number;items:{name:string;amount:number;pct:number}[]};
  products:{sku:string;asin:string;title:string;units:number;revenue:number;amazonFees:number;adSpend:number;cogs:number;refunds:number;netProfit:number;marginPercent:number}[];
  period:number;
};
export type ProfitCalculatorRow={id:string;sku:string;asin:string;title:string;units:number;revenue:number;avgPrice:number;fbaFee:number;referralPct:number;referralAmt:number;cogsPerUnit:number;storageFeePerUnit:number;refundRate:number;marketingPct:number;profit:number;marginPct:number};
export type TrafficRawRow={productId:string;sku:string;asin:string;title:string;date:string;units:number;revenue:number;adSpend:number;organicSessions:number;paidSessions:number};

async function getReal<T>(path:string):Promise<T|null>{
  try{
    const r=await fetch(`${API}${path}${path.includes('?')?'&':'?'}workspaceId=${DEMO_WORKSPACE_ID}`,{cache:'no-store'});
    return r.ok?((await r.json()) as T):null;
  }catch{return null;}
}

export const fetchDashboardOverview=(days:number)=>getReal<DashboardOverviewResponse>(`/v1/dashboard/overview?days=${days}`);
export const fetchProfitCalculator=(days:number)=>getReal<ProfitCalculatorRow[]>(`/v1/profit/calculator?days=${days}`);
export const fetchTrafficRaw=(days:number)=>getReal<TrafficRawRow[]>(`/v1/traffic/raw?days=${days}`);

export type EmailCheck={exists:boolean;providers:string[]};
export async function checkEmail(email:string):Promise<EmailCheck>{
  try{
    const r=await fetch(`${API}/v1/auth/check-email?email=${encodeURIComponent(email)}`,{cache:'no-store'});
    return r.ok?((await r.json()) as EmailCheck):{exists:false,providers:[]};
  }catch{return{exists:false,providers:[]};}
}
