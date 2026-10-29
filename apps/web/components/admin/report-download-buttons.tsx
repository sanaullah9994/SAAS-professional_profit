'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@amazon-profit/ui';

const formats = [
  { format: 'csv', label: 'CSV spreadsheet', icon: FileSpreadsheet },
  { format: 'pdf', label: 'PDF document', icon: FileText },
  { format: 'docx', label: 'Word document (DOCX)', icon: FileText },
] as const;

export function ReportDownloadButtons() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function download(format: (typeof formats)[number]['format']) {
    setLoading(format);
    setError('');

    try {
      const response = await fetch(
        `/api/v1/admin/reports/export?format=${format}`,
        { cache: 'no-store' },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Could not download the report.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `profitpilot-admin-report-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        disabled={loading !== null}
        onClick={() => {
          setOpen((current) => !current);
          setError('');
        }}
      >
        {loading ? (
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {loading ? 'Preparing report...' : 'Download Report'}
      </Button>

      {open && !loading ? (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-border bg-background p-2 shadow-lg">
          <p className="px-3 py-2 text-xs text-muted-foreground">
            Choose a download format
          </p>
          {formats.map(({ format, label, icon: Icon }) => (
            <button
              key={format}
              type="button"
              onClick={() => void download(format)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm hover:bg-muted"
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 max-w-64 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
