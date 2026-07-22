import { Card, CardContent } from '@amazon-profit/ui';
import { PageHeader } from '@/components/dashboard';
export default function Page() {
  return (
    <>
      <PageHeader title="Performance" description="Account health, order defect rate, and policy compliance at a glance." />
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">Coming soon.</CardContent>
      </Card>
    </>
  );
}
