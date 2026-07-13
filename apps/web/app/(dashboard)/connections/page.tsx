import { Card,CardContent } from '@amazon-profit/ui';
import { DataTable,PageHeader } from '@/components/dashboard';
export default function Page(){const rows=[["Seller Central", "Amazon US", "Connected", "Mock"], ["Amazon Ads", "Amazon US", "Connected", "Mock"]];return <><PageHeader title="Amazon Connections" description="Mock Seller Central and Ads connections until approvals are complete."/><Card><CardContent className="pt-5"><DataTable headers={["Connection", "Marketplace", "Status", "Mode"]} rows={rows}/></CardContent></Card></>}
