import { Card, CardContent } from '@amazon-profit/ui';
import { PageHeader } from '@/components/dashboard';
export default function Page() {
  return (
    <>
      <PageHeader title="User Permissions" description="Role-based access for your team across every client account." />
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">Coming soon.</CardContent>
      </Card>
    </>
  );
}
