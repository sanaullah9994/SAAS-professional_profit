import { Card, CardContent } from '@amazon-profit/ui';
import { PageHeader } from '@/components/dashboard';
export default function Page() {
  return (
    <>
      <PageHeader title="Products and COGS" description="Every listed product with its current cost of goods sold." />
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">Coming soon.</CardContent>
      </Card>
    </>
  );
}
