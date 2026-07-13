import {summary,trend,skus} from './mock';
const API=process.env.NEXT_PUBLIC_API_URL??'http://localhost:4000';
async function safe<T>(path:string,fallback:T){try{const r=await fetch(API+path,{next:{revalidate:60}});return r.ok?await r.json() as T:fallback}catch{return fallback}}
export const overviewData=()=>safe('/v1/dashboard/overview?days=30',{summary,trend,period:30});
export const skuData=()=>safe('/v1/profit/skus?days=30',skus);
