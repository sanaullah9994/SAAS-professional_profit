import { loadAdminReport } from './data';
import { buildCsvReport } from './csv';
import { buildPdfReport } from './pdf';
import { buildDocxReport } from './docx';

export { loadAdminReport };

export type ReportFormat = 'csv' | 'pdf' | 'docx';

export async function generateAdminReport(format: ReportFormat) {
  const report = await loadAdminReport();

  switch (format) {
    case 'csv':
      return {
        body: buildCsvReport(report),
        contentType: 'text/csv; charset=utf-8',
        extension: 'csv',
      };
    case 'pdf':
      return {
        body: buildPdfReport(report),
        contentType: 'application/pdf',
        extension: 'pdf',
      };
    case 'docx':
      return {
        body: await buildDocxReport(report),
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: 'docx',
      };
  }
}
