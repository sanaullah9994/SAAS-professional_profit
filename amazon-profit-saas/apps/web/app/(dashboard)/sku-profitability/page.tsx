import { Button,Card,CardContent } from '@amazon-profit/ui';
import { formatCurrency,formatPercent } from '@amazon-profit/utils';
import { skus } from '@/lib/mock';
import { DataTable,PageHeader } from '@/components/dashboard';
export default function Page(){return <><PageHeader title="SKU Profitability" description="True profit by SKU and ASIN using the COGS active on each order date." action={<Button asChild variant="outline"><a href={`${process.env.NEXT_PUBLIC_API_URL??'http://localhost:4000'}/v1/profit/skus.csv`}>Export CSV</a></Button>}/><Card><CardContent className="pt-5"><DataTable headers={['SKU','ASIN','Units','Revenue','Amazon Fees','Ads','Landed Cost','Refunds','Net Profit','Margin']} rows={skus.map(r=>[r.sku,r.asin,r.units.toLocaleString(),formatCurrency(r.revenue),formatCurrency(r.amazonFees),formatCurrency(r.adSpend),formatCurrency(r.cogs),formatCurrency(r.refunds),formatCurrency(r.netProfit),formatPercent(r.marginPercent)])}/></CardContent></Card></>}
