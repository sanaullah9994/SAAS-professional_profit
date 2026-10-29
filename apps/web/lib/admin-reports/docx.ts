import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
} from 'docx';
import { buildReportSections, type AdminReport } from './data';

function text(value: unknown): string {
  return String(value ?? '').slice(0, 2000);
}

export async function buildDocxReport(report: AdminReport): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: 'ProfitPilot Admin Report',
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph(`Generated at: ${report.generatedAt}`),
    new Paragraph(
      `Users: ${report.overview.totalUsers} | Workspaces: ${report.overview.totalWorkspaces} | Organizations: ${report.overview.totalOrganizations}`,
    ),
  ];

  for (const section of buildReportSections(report)) {
    children.push(
      new Paragraph({
        text: section.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 120 },
      }),
    );

    const rows = section.rows.map(
      (row) =>
        new TableRow({
          children: row.map(
            (value, index) =>
              new TableCell({
                width: {
                  size: Math.floor(100 / Math.max(row.length, 1)),
                  type: WidthType.PERCENTAGE,
                },
                children: [
                  new Paragraph({
                    text: text(value),
                    ...(index === 0 && section.rows.indexOf(row) === 0
                      ? { heading: HeadingLevel.HEADING_3 }
                      : {}),
                  }),
                ],
              }),
          ),
        }),
    );

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows,
      }),
    );
  }

  const document = new Document({
    sections: [{ children }],
    creator: 'ProfitPilot',
    title: 'ProfitPilot Admin Report',
    description: 'Platform administration report',
  });

  return Packer.toBuffer(document);
}
