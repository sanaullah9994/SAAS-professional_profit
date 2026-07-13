import { Card,CardContent } from '@amazon-profit/ui';
import { DataTable,PageHeader } from '@/components/dashboard';
export default function Page(){const rows=[["114-9283610-0188251", "Jul 13, 2026", "Shipped", "3", "$89.97"], ["112-7719205-3206621", "Jul 13, 2026", "Unshipped", "1", "$29.99"]];return <><PageHeader title="Orders" description="Orders and item revenue imported from Seller Central."/><Card><CardContent className="pt-5"><DataTable headers={["Order ID", "Purchase date", "Status", "Units", "Revenue"]} rows={rows}/></CardContent></Card></>}
