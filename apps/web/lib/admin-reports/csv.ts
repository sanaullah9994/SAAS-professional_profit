import { buildReportSections, type AdminReport } from './data';

function safeCell(value: unknown): string {
  let text = value == null ? '' : String(value);

  // Prevent spreadsheet formula injection.
  if (/^[\s]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export function buildCsvReport(report: AdminReport): string {
  const sections = buildReportSections(report);
  const lines: string[] = [
    safeCell('ProfitPilot Admin Report'),
    safeCell('Generated at: ' + report.generatedAt),
    '',
  ];

  for (const section of sections) {
    lines.push(safeCell(section.title));

    for (const row of section.rows) {
      lines.push(row.map(safeCell).join(','));
    }

    lines.push('');
  }

  return '\uFEFF' + lines.join('\r\n');
}
