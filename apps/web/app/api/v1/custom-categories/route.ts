import { NextRequest, NextResponse } from 'next/server';
import { query } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export type CustomCategoryRow = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
};

const NAME_MAX = 60;
const DESCRIPTION_MAX = 200;

const selectSql = `SELECT id, name, description, created_at FROM custom_categories`;

function toRow(r: { id: string; name: string; description: string | null; created_at: Date }): CustomCategoryRow {
  return { id: r.id, name: r.name, description: r.description, createdAt: r.created_at.toISOString() };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505';
}

export async function GET() {
  const w = await workspaceId();
  const { rows } = await query(
    `${selectSql} WHERE workspace_id=$1 ORDER BY lower(name) ASC`,
    [w],
  );
  return NextResponse.json((rows as Parameters<typeof toRow>[0][]).map(toRow));
}

export async function POST(req: NextRequest) {
  const w = await workspaceId();
  const body = (await req.json().catch(() => null)) as { name?: string; description?: string } | null;
  const name = (body?.name ?? '').trim();
  const description = (body?.description ?? '').trim() || null;

  if (!name) return NextResponse.json({ error: 'Category name is required.' }, { status: 400 });
  if (name.length > NAME_MAX) {
    return NextResponse.json({ error: `Category name must be ${NAME_MAX} characters or fewer.` }, { status: 400 });
  }
  if (description && description.length > DESCRIPTION_MAX) {
    return NextResponse.json({ error: `Description must be ${DESCRIPTION_MAX} characters or fewer.` }, { status: 400 });
  }

  try {
    const { rows } = await query(
      `INSERT INTO custom_categories(workspace_id,name,description) VALUES($1,$2,$3) RETURNING id,name,description,created_at`,
      [w, name, description],
    );
    return NextResponse.json(toRow(rows[0] as Parameters<typeof toRow>[0]));
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: 'A category with this name already exists.' }, { status: 409 });
    }
    throw error;
  }
}

export async function PATCH(req: NextRequest) {
  const w = await workspaceId();
  const body = (await req.json().catch(() => null)) as
    | { id?: string; name?: string; description?: string | null }
    | null;
  const id = body?.id ?? '';
  const name = (body?.name ?? '').trim();
  const description = body?.description == null ? null : String(body.description).trim() || null;

  if (!id) return NextResponse.json({ error: 'Category id is required.' }, { status: 400 });
  if (!name) return NextResponse.json({ error: 'Category name is required.' }, { status: 400 });
  if (name.length > NAME_MAX) {
    return NextResponse.json({ error: `Category name must be ${NAME_MAX} characters or fewer.` }, { status: 400 });
  }
  if (description && description.length > DESCRIPTION_MAX) {
    return NextResponse.json({ error: `Description must be ${DESCRIPTION_MAX} characters or fewer.` }, { status: 400 });
  }

  try {
    const { rows } = await query(
      `UPDATE custom_categories SET name=$1, description=$2, updated_at=now()
        WHERE id=$3 AND workspace_id=$4
        RETURNING id,name,description,created_at`,
      [name, description, id, w],
    );
    if (!rows[0]) return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
    return NextResponse.json(toRow(rows[0] as Parameters<typeof toRow>[0]));
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: 'A category with this name already exists.' }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(req: NextRequest) {
  const w = await workspaceId();
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!id) return NextResponse.json({ error: 'Category id is required.' }, { status: 400 });

  const { rowCount } = await query(`DELETE FROM custom_categories WHERE id=$1 AND workspace_id=$2`, [id, w]);
  if (!rowCount) return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
