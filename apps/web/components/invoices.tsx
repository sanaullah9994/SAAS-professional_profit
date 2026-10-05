'use client';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Badge, Button, Card, CardContent } from '@amazon-profit/ui';
import { PageHeader } from '@/components/dashboard';
import { fetchInvoices, type InvoiceRow } from '@/lib/api';

const PAGE_SIZE = 8;

const fmtMoney = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

const statusVariant = (status: InvoiceRow['status']) =>
  status === 'paid' ? 'success' : status === 'pending' ? 'warning' : 'outline';

const statusLabel = (status: InvoiceRow['status']) => (status === 'paid' ? 'Paid' : status === 'pending' ? 'Pending' : 'Void');

function SkeletonRow() {
  return (
    <tr className="border-b border-border">
      <td className="p-4"><div className="pp-skeleton h-4 w-32" /></td>
      <td className="p-4"><div className="pp-skeleton h-5 w-16 rounded-full" /></td>
      <td className="p-4"><div className="pp-skeleton h-4 w-16" /></td>
      <td className="p-4"><div className="pp-skeleton h-4 w-40" /></td>
    </tr>
  );
}

export function InvoicesPage() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    const data = await fetchInvoices();
    if (data === null) {
      setLoadError('We could not load your invoices. Please refresh the page.');
    } else {
      setLoadError(null);
      setRows(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = rows.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <>
      <PageHeader title="Invoices" description="Billing history and downloadable receipts for your subscription." />

      <Card>
        <CardContent className="pt-5">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="h-11 px-4 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    ID
                  </th>
                  <th className="h-11 px-4 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th className="h-11 px-4 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Amount Due
                  </th>
                  <th className="h-11 px-4 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Issue Date{' '}
                    <span className="ml-1 font-semibold normal-case tracking-normal text-muted-foreground/70">
                      in UTC
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading && [0, 1, 2, 3].map((i) => <SkeletonRow key={i} />)}

                {!loading && !loadError && rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-0">
                      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                        <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <FileText className="size-5" />
                        </span>
                        <p className="text-sm font-bold">No invoices yet</p>
                        <p className="max-w-sm text-sm font-medium text-muted-foreground">
                          Your billing history will appear here. Each invoice shows its status, amount due, and the
                          date it was issued in UTC.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && loadError && (
                  <tr>
                    <td colSpan={4} className="p-0">
                      <div className="px-6 py-12 text-center text-sm font-medium text-muted-foreground">{loadError}</div>
                    </td>
                  </tr>
                )}

                {!loading &&
                  !loadError &&
                  visible.map((row) => (
                    <tr key={row.id} className="transition hover:bg-muted/40">
                      <td className="p-4 align-top font-bold tracking-tight tabular-nums">{row.invoiceNumber}</td>
                      <td className="p-4 align-top">
                        <Badge
                          variant={statusVariant(row.status)}
                          className="font-bold uppercase tracking-wide"
                        >
                          {statusLabel(row.status)}
                        </Badge>
                      </td>
                      <td className="p-4 align-top font-bold tabular-nums">{fmtMoney(row.amountDue)}</td>
                      <td className="p-4 align-top text-sm font-medium text-muted-foreground">{fmtDate(row.issueDate)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {!loading && !loadError && rows.length > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 px-1 pb-1 pt-4">
              <span className="text-xs font-semibold text-muted-foreground">
                Page {currentPage + 1} of {pageCount}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={currentPage >= pageCount - 1}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
