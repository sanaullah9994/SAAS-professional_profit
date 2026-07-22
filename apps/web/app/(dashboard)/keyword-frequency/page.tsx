import { Card, CardContent } from '@amazon-profit/ui';
import { PageHeader } from '@/components/dashboard';
export default function Page() {
  return (
    <>
      <PageHeader title="Keyword Frequency" description="How often top keywords appear across your catalog's titles and listings." />
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">Coming soon.</CardContent>
      </Card>
    </>
  );
}
