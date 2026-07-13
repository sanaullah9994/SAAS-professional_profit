import { Card,CardContent } from '@amazon-profit/ui';
import { DataTable,PageHeader } from '@/components/dashboard';
export default function Page(){const rows=[["Brand", "Northstar Brand"], ["Marketplace", "Amazon US"], ["Currency", "USD"], ["Automatic sync", "Every hour"], ["Initial import", "90 days"]];return <><PageHeader title="Settings" description="Workspace, reporting, sync, and alert preferences."/><Card><CardContent className="pt-5"><DataTable headers={["Setting", "Value"]} rows={rows}/></CardContent></Card></>}
