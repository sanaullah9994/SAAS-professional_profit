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

export type CustomCategoryRow={id:string;name:string;description:string|null;createdAt:string};
export type CustomCategoryResult={ok:boolean;row?:CustomCategoryRow;error?:string};
export const fetchCustomCategories=()=>getReal<CustomCategoryRow[]>('/api/v1/custom-categories');
async function customCategoryResult(r:Response):Promise<CustomCategoryResult>{
  const data=await r.json().catch(()=>null);
  if(r.ok)return{ok:true,row:data as CustomCategoryRow};
  return{ok:false,error:(data as {error?:string}|null)?.error??'Something went wrong. Please try again.'};
}
export async function createCustomCategory(name:string,description:string|null):Promise<CustomCategoryResult>{
  try{
    const r=await fetch('/api/v1/custom-categories',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,description})});
    return await customCategoryResult(r);
  }catch{return{ok:false,error:'Network error. Please try again.'};}
}
export async function updateCustomCategory(id:string,name:string,description:string|null):Promise<CustomCategoryResult>{
  try{
    const r=await fetch('/api/v1/custom-categories',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,name,description})});
    return await customCategoryResult(r);
  }catch{return{ok:false,error:'Network error. Please try again.'};}
}
export async function deleteCustomCategory(id:string):Promise<CustomCategoryResult>{
  try{
    const r=await fetch(`/api/v1/custom-categories?id=${encodeURIComponent(id)}`,{method:'DELETE'});
    return r.ok?{ok:true}:{ok:false,error:'Could not delete this category. Please try again.'};
  }catch{return{ok:false,error:'Network error. Please try again.'};}
}

export type ManualExpenseRow={id:string;description:string;type:string;amount:number;status:'paid'|'pending';expenseDate:string;endDate:string|null;notes:string|null;createdAt:string};
export type ManualExpenseInput={description:string;type:string;amount:number;status:'paid'|'pending';expenseDate:string;endDate:string|null;notes:string|null};
export type ManualExpenseResult={ok:boolean;row?:ManualExpenseRow;error?:string};
export const fetchManualExpenses=()=>getReal<ManualExpenseRow[]>('/api/v1/manual-expenses');
async function manualExpenseResult(r:Response):Promise<ManualExpenseResult>{
  const data=await r.json().catch(()=>null);
  if(r.ok)return{ok:true,row:data as ManualExpenseRow};
  return{ok:false,error:(data as {error?:string}|null)?.error??'Something went wrong. Please try again.'};
}
export async function createManualExpense(input:ManualExpenseInput):Promise<ManualExpenseResult>{
  try{
    const r=await fetch('/api/v1/manual-expenses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
    return await manualExpenseResult(r);
  }catch{return{ok:false,error:'Network error. Please try again.'};}
}
export async function updateManualExpense(id:string,input:ManualExpenseInput):Promise<ManualExpenseResult>{
  try{
    const r=await fetch('/api/v1/manual-expenses',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,...input})});
    return await manualExpenseResult(r);
  }catch{return{ok:false,error:'Network error. Please try again.'};}
}
export async function deleteManualExpense(id:string):Promise<ManualExpenseResult>{
  try{
    const r=await fetch(`/api/v1/manual-expenses?id=${encodeURIComponent(id)}`,{method:'DELETE'});
    return r.ok?{ok:true}:{ok:false,error:'Could not delete this expense. Please try again.'};
  }catch{return{ok:false,error:'Network error. Please try again.'};}
}

export type TagType='Exact'|'Phrase'|'Broad';
export type SearchTermTagRow={id:string;searchTerm:string;type:TagType;tag:string;createdAt:string};
export type SearchTermTagInput={searchTerm:string;type:TagType;tag:string};
export type SearchTermTagResult={ok:boolean;row?:SearchTermTagRow;inserted?:number;skipped?:number;error?:string};
export const fetchSearchTermTags=()=>getReal<SearchTermTagRow[]>('/api/v1/search-term-tags');
export async function createSearchTermTags(items:SearchTermTagInput[]):Promise<SearchTermTagResult>{
  try{
    const r=await fetch('/api/v1/search-term-tags',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items})});
    const data=await r.json().catch(()=>null);
    if(r.ok)return{ok:true,inserted:(data as {inserted?:SearchTermTagRow[]}).inserted?.length??0,skipped:(data as {skipped?:number}).skipped??0};
    return{ok:false,error:(data as {error?:string}|null)?.error??'Something went wrong. Please try again.'};
  }catch{return{ok:false,error:'Network error. Please try again.'};}
}
export async function updateSearchTermTag(id:string,input:SearchTermTagInput):Promise<SearchTermTagResult>{
  try{
    const r=await fetch('/api/v1/search-term-tags',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,...input})});
    const data=await r.json().catch(()=>null);
    if(r.ok)return{ok:true,row:data as SearchTermTagRow};
    return{ok:false,error:(data as {error?:string}|null)?.error??'Something went wrong. Please try again.'};
  }catch{return{ok:false,error:'Network error. Please try again.'};}
}
export async function deleteSearchTermTag(id:string):Promise<{ok:boolean;error?:string}>{
  try{
    const r=await fetch(`/api/v1/search-term-tags?id=${encodeURIComponent(id)}`,{method:'DELETE'});
    return r.ok?{ok:true}:{ok:false,error:'Could not delete this tag. Please try again.'};
  }catch{return{ok:false,error:'Network error. Please try again.'};}
}

export type InvoiceStatus='paid'|'pending'|'void';
export type InvoiceRow={id:string;invoiceNumber:string;status:InvoiceStatus;amountDue:number;issueDate:string;description:string|null};
export const fetchInvoices=()=>getReal<InvoiceRow[]>('/api/v1/invoices');
