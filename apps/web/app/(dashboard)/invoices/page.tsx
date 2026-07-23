import { Card, CardContent } from '@amazon-profit/ui';
import { PageHeader } from '@/components/dashboard';
export default function Page() {
  return (
    <>
      <PageHeader title="Invoices" description="Billing history and downloadable receipts for your subscription." />
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">Coming soon.</CardContent>
      </Card>
    </>
  );
}
