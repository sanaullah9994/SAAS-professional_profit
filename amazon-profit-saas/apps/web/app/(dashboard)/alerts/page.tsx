import { Card,CardContent } from '@amazon-profit/ui';
import { DataTable,PageHeader } from '@/components/dashboard';
export default function Page(){const rows=[["Critical", "Unattributed ad spend increased", "42% above seven-day average"], ["Warning", "Margin declined", "NS-LUNCH-01 is below target"], ["Info", "Review COGS", "Two SKUs have old cost records"]];return <><PageHeader title="Alerts" description="Profit, PPC, refund, sync, and data-quality exceptions."/><Card><CardContent className="pt-5"><DataTable headers=["Severity", "Alert", "Message"] rows={rows}/></CardContent></Card></>}
