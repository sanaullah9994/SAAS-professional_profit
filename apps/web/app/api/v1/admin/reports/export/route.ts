import { generateAdminReport } from '@/lib/admin-reports';
import { recordAuditLog } from '@/lib/admin-audit';
import { requirePlatformAdminApi } from '@/lib/admin-auth';

const FORMATS = ['csv', 'pdf', 'docx'] as const;

export async function GET(request: Request) {
  const authz = await requirePlatformAdminApi(request.headers);

  if ('response' in authz) {
    return authz.response;
  }
  const { admin } = authz;

  const format = new URL(request.url).searchParams.get('format');

  if (!format || !FORMATS.includes(format as (typeof FORMATS)[number])) {
    return Response.json(
      { error: 'Invalid format. Choose csv, pdf, or docx.' },
      { status: 400 },
    );
  }

  try {
    const report = await generateAdminReport(
      format as (typeof FORMATS)[number],
    );

    const date = new Date().toISOString().slice(0, 10);
    const filename = `profitpilot-admin-report-${date}.${report.extension}`;

    await recordAuditLog({
      actorUserId: admin.id,
      actorEmail: admin.email,
      action: 'report.export',
      entityType: 'admin_report',
      entityId: format,
      success: true,
      ipAddress:
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      metadata: { format },
    });

    const body =
      typeof report.body === 'string'
        ? report.body
        : new Uint8Array(report.body);

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': report.contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, private',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return Response.json(
      { error: 'Report generation failed. Please try again.' },
      { status: 500 },
      );
  }
}
