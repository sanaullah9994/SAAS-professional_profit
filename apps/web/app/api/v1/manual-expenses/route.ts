import { NextRequest, NextResponse } from 'next/server';
import { query } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export const EXPENSE_TYPES = [
  'Software & Subscriptions',
  'Shipping & Fulfilment',
  'Payroll & Contractors',
  'Marketing & Advertising',
  'Office & Supplies',
  'Taxes & Licenses',
  'Other',
] as const;

export const EXPENSE_STATUSES = ['paid', 'pending'] as const;

export type ManualExpenseRow = {
  id: string;
  description: string;
  type: string;
  amount: number;
  status: 'paid' | 'pending';
  expenseDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
};

const DESCRIPTION_MAX = 160;
const NOTES_MAX = 500;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const selectSql = `SELECT id, description, type, amount, status, expense_date::text AS expense_date,
  end_date::text AS end_date, notes, created_at FROM manual_expenses`;

type PgRow = {
  id: string;
  description: string;
  type: string;
  amount: string | number;
  status: 'paid' | 'pending';
  expense_date: string;
  end_date: string | null;
  notes: string | null;
  created_at: Date;
};

function toRow(r: PgRow): ManualExpenseRow {
  return {
    id: r.id,
    description: r.description,
    type: r.type,
    amount: Number(r.amount),
    status: r.status,
    expenseDate: r.expense_date,
    endDate: r.end_date,
    notes: r.notes,
    createdAt: r.created_at.toISOString(),
  };
}

type Body = {
  description?: string;
  type?: string;
  amount?: number | string;
  status?: string;
  expenseDate?: string;
  endDate?: string | null;
  notes?: string | null;
};

function validate(body: Body | null): { error?: string; values?: Omit<ManualExpenseRow, 'id' | 'createdAt'> } {
  const description = (body?.description ?? '').trim();
  const type = (body?.type ?? '').trim();
  const status = (body?.status ?? '').trim();
  const expenseDate = (body?.expenseDate ?? '').trim();
  const endDateRaw = (body?.endDate ?? '').trim();
  const notes = (body?.notes ?? '').trim();
  const amount = Number(body?.amount);

  if (!description) return { error: 'Description is required.' };
  if (description.length > DESCRIPTION_MAX) return { error: `Description must be ${DESCRIPTION_MAX} characters or fewer.` };
  if (!EXPENSE_TYPES.includes(type as (typeof EXPENSE_TYPES)[number])) return { error: 'Choose a valid expense type.' };
  if (!Number.isFinite(amount) || amount < 0) return { error: 'Enter a valid amount.' };
  if (amount > 999999999) return { error: 'Amount is too large.' };
  if (!EXPENSE_STATUSES.includes(status as (typeof EXPENSE_STATUSES)[number])) return { error: 'Choose a valid status.' };
  if (!DATE_RE.test(expenseDate)) return { error: 'Choose a valid date.' };
  if (endDateRaw && !DATE_RE.test(endDateRaw)) return { error: 'Choose a valid period end date.' };
  if (endDateRaw && endDateRaw < expenseDate) return { error: 'Period end date must be on or after the start date.' };
  if (notes.length > NOTES_MAX) return { error: `Notes must be ${NOTES_MAX} characters or fewer.` };

  return {
    values: {
      description,
      type,
      amount,
      status: status as 'paid' | 'pending',
      expenseDate,
      endDate: endDateRaw || null,
      notes: notes || null,
    },
  };
}

export async function GET() {
  const w = await workspaceId();
  const { rows } = await query(`${selectSql} WHERE workspace_id=$1 ORDER BY expense_date DESC, created_at DESC`, [w]);
  return NextResponse.json((rows as PgRow[]).map(toRow));
}

export async function POST(req: NextRequest) {
  const w = await workspaceId();
  const body = (await req.json().catch(() => null)) as Body | null;
  const { error, values } = validate(body);
  if (error || !values) return NextResponse.json({ error: error ?? 'Invalid expense.' }, { status: 400 });

  const { rows } = await query(
    `INSERT INTO manual_expenses(workspace_id,description,type,amount,status,expense_date,end_date,notes)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, description, type, amount, status, expense_date::text AS expense_date,
       end_date::text AS end_date, notes, created_at`,
    [w, values.description, values.type, values.amount, values.status, values.expenseDate, values.endDate, values.notes],
  );
  return NextResponse.json(toRow(rows[0] as PgRow));
}

export async function PATCH(req: NextRequest) {
  const w = await workspaceId();
  const body = (await req.json().catch(() => null)) as (Body & { id?: string }) | null;
  const id = body?.id ?? '';
  if (!id) return NextResponse.json({ error: 'Expense id is required.' }, { status: 400 });

  const { error, values } = validate(body);
  if (error || !values) return NextResponse.json({ error: error ?? 'Invalid expense.' }, { status: 400 });

  const { rows } = await query(
    `UPDATE manual_expenses
        SET description=$1, type=$2, amount=$3, status=$4, expense_date=$5, end_date=$6, notes=$7, updated_at=now()
      WHERE id=$8 AND workspace_id=$9
      RETURNING id, description, type, amount, status, expense_date::text AS expense_date,
        end_date::text AS end_date, notes, created_at`,
    [values.description, values.type, values.amount, values.status, values.expenseDate, values.endDate, values.notes, id, w],
  );
  if (!rows[0]) return NextResponse.json({ error: 'Expense not found.' }, { status: 404 });
  return NextResponse.json(toRow(rows[0] as PgRow));
}

export async function DELETE(req: NextRequest) {
  const w = await workspaceId();
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!id) return NextResponse.json({ error: 'Expense id is required.' }, { status: 400 });

  const { rowCount } = await query(`DELETE FROM manual_expenses WHERE id=$1 AND workspace_id=$2`, [id, w]);
  if (!rowCount) return NextResponse.json({ error: 'Expense not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
