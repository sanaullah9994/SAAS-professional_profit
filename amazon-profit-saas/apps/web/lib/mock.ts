import type { ProfitTrendPoint,SkuProfitabilityRow } from '@amazon-profit/types';
export const summary={revenue:87462.28,profit:21408.64,marginPercent:24.5,adSpend:9630.42,tacosPercent:11,refunds:1842.13,units:3248};
export const trend:ProfitTrendPoint[]=Array.from({length:30},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(29-i));return{date:d.toISOString().slice(0,10),revenue:2400+i*22+Math.sin(i/3)*420,profit:540+i*8+Math.sin(i/3)*125,adSpend:260+Math.cos(i/4)*55}});
export const skus:SkuProfitabilityRow[]=[
{sku:'NS-BOTTLE-32-BLK',asin:'B0DEMO0001',title:'Insulated Water Bottle 32 oz — Black',units:982,revenue:29450,amazonFees:6830,adSpend:2960,cogs:9534,refunds:510,netProfit:9616,marginPercent:32.7},
{sku:'NS-BOTTLE-32-BLU',asin:'B0DEMO0002',title:'Insulated Water Bottle 32 oz — Blue',units:814,revenue:24410,amazonFees:5710,adSpend:2675,cogs:8010,refunds:402,netProfit:7613,marginPercent:31.2},
{sku:'NS-TUMBLER-20',asin:'B0DEMO0004',title:'Stainless Steel Tumbler 20 oz',units:765,revenue:19125,amazonFees:4870,adSpend:2360,cogs:7020,refunds:418,netProfit:4457,marginPercent:23.3},
{sku:'NS-LUNCH-01',asin:'B0DEMO0003',title:'Insulated Lunch Bag',units:687,revenue:14477,amazonFees:3944,adSpend:1515,cogs:6335,refunds:512,netProfit:2171,marginPercent:15},
{sku:'UNATTRIBUTED',asin:'—',title:'Unattributed advertising',units:0,revenue:0,amazonFees:0,adSpend:120.42,cogs:0,refunds:0,netProfit:-120.42,marginPercent:0}
];
