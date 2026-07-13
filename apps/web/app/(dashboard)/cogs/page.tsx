import { Card,CardContent } from '@amazon-profit/ui';
import { DataTable,PageHeader } from '@/components/dashboard';
export default function Page(){const rows=[["NS-BOTTLE-32-BLK", "Jan 1, 2026", "$8.25", "$0.85", "$0.35", "$0.30"], ["NS-LUNCH-01", "Mar 15, 2026", "$7.80", "$0.92", "$0.42", "$0.35"]];return <><PageHeader title="COGS Manager" description="Effective-dated COGS, freight, customs, and prep costs with CSV bulk upload."/><Card><CardContent className="pt-5"><DataTable headers={["SKU", "Effective from", "COGS", "Inbound", "Customs", "Prep"]} rows={rows}/></CardContent></Card></>}
