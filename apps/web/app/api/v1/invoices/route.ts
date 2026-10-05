import { NextResponse } from 'next/server';
import { query } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export type InvoiceStatus = 'paid' | 'pending' | 'void';

export type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  amountDue: number;
  issueDate: string;
  description: string | null;
};

type PgRow = {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  amount_due: string | number;
  issue_date: string | Date;
  description: string | null;
};

const toRow = (r: PgRow): InvoiceRow => ({
  id: r.id,
  invoiceNumber: r.invoice_number,
  status: r.status,
  amountDue: Number(r.amount_due),
  issueDate: new Date(r.issue_date).toISOString(),
  description: r.description,
});

export async function GET() {
  const w = await workspaceId();
  const { rows } = await query(
    `SELECT id, invoice_number, status, amount_due, issue_date, description
       FROM invoices
      WHERE workspace_id=$1
      ORDER BY issue_date DESC, invoice_number DESC`,
    [w],
  );
  return NextResponse.json((rows as PgRow[]).map(toRow));
}
