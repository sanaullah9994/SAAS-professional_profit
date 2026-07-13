import { Card,CardContent } from '@amazon-profit/ui';
import { DataTable,PageHeader } from '@/components/dashboard';
export default function Page(){const rows=[["114-9283610-0188251", "NS-BOTTLE-32-BLK", "$29.99", "$5.00", "Customer return"], ["112-3108002-9021408", "NS-LUNCH-01", "$21.99", "$4.40", "Damaged item"]];return <><PageHeader title="Refund Analytics" description="Refund amounts, administration fees, affected SKUs, and reasons."/><Card><CardContent className="pt-5"><DataTable headers={["Order ID", "SKU", "Amount", "Admin fee", "Reason"]} rows={rows}/></CardContent></Card></>}
