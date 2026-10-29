import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { buildReportSections, type AdminReport } from './data';

function printable(value: unknown): string {
  return String(value ?? '')
    .replace(/[^\x20-\x7E]/g, '?')
    .slice(0, 500);
}

export function buildPdfReport(report: AdminReport): ArrayBuffer {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const margin = 36;

  pdf.setFontSize(20);
  pdf.text('ProfitPilot Admin Report', margin, 42);
  pdf.setFontSize(9);
  pdf.text(`Generated: ${report.generatedAt}`, margin, 60);
  pdf.text(
    `Users: ${report.overview.totalUsers} | Workspaces: ${report.overview.totalWorkspaces} | Organizations: ${report.overview.totalOrganizations}`,
    margin,
    76,
  );

  let y = 96;

  for (const section of buildReportSections(report)) {
    if (y > 500) {
      pdf.addPage();
      y = 42;
    }

    pdf.setFontSize(12);
    pdf.text(printable(section.title), margin, y);
    y += 8;

    const body = section.rows.slice(1).map((row) => row.map(printable));
    const head = section.rows.length
      ? [section.rows[0].map(printable)]
      : [[]];

    autoTable(pdf, {
      startY: y,
      head,
      body,
      margin: { left: margin, right: margin },
      styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [35, 52, 75] },
      didDrawPage: () => {
        const pageCount = pdf.getNumberOfPages();
        pdf.setFontSize(8);
        pdf.text(
          `ProfitPilot Admin Report | Page ${pageCount}`,
          margin,
          pdf.internal.pageSize.getHeight() - 16,
        );
      },
    });

    y = (pdf as jsPDF & { lastAutoTable?: { finalY: number } })
      .lastAutoTable?.finalY
      ? (pdf as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24
      : y + 24;
  }

  return pdf.output('arraybuffer');
}
