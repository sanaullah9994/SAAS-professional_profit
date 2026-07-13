import { Card,CardContent } from '@amazon-profit/ui';
import { DataTable,PageHeader } from '@/components/dashboard';
export default function Page(){const rows=[["Jul 13, 2026 9:00 PM", "Scheduled", "2 days", "836", "Completed"], ["Jul 13, 2026 3:42 PM", "Manual", "90 days", "18,420", "Completed"]];return <><PageHeader title="Sync History" description="Hourly and manual imports with retries and run status."/><Card><CardContent className="pt-5"><DataTable headers=["Started", "Trigger", "Range", "Records", "Status"] rows={rows}/></CardContent></Card></>}
