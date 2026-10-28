import { NextRequest, NextResponse } from 'next/server';
import { query } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export const TAG_TYPES = ['Exact', 'Phrase', 'Broad'] as const;
export type TagType = (typeof TAG_TYPES)[number];

export type SearchTermTagRow = {
  id: string;
  searchTerm: string;
  type: TagType;
  tag: string;
  createdAt: string;
};

const TERM_MAX = 128;
const TAG_MAX = 40;
const BULK_MAX = 500;

const selectSql = `SELECT id, search_term, type, tag, created_at FROM search_term_tags`;

type PgRow = { id: string; search_term: string; type: TagType; tag: string; created_at: Date };

const toRow = (r: PgRow): SearchTermTagRow => ({
  id: r.id,
  searchTerm: r.search_term,
  type: r.type,
  tag: r.tag,
  createdAt: r.created_at.toISOString(),
});

type Input = { searchTerm?: string; type?: string; tag?: string };

function validate(item: Input): { error?: string; values?: { searchTerm: string; type: TagType; tag: string } } {
  const searchTerm = (item?.searchTerm ?? '').trim();
  const type = (item?.type ?? '').trim();
  const tag = (item?.tag ?? '').trim();

  if (!searchTerm) return { error: 'Search term is required.' };
  if (searchTerm.length > TERM_MAX) return { error: `Search term must be ${TERM_MAX} characters or fewer.` };
  if (!TAG_TYPES.includes(type as TagType)) return { error: 'Choose a valid type.' };
  if (!tag) return { error: 'Tag is required.' };
  if (tag.length > TAG_MAX) return { error: `Tag must be ${TAG_MAX} characters or fewer.` };

  return { values: { searchTerm, type: type as TagType, tag } };
}

export async function GET() {
  const w = await workspaceId();
  const { rows } = await query(
    `${selectSql} WHERE workspace_id=$1 ORDER BY lower(tag), lower(search_term)`,
    [w],
  );
  return NextResponse.json((rows as PgRow[]).map(toRow));
}

export async function POST(req: NextRequest) {
  const w = await workspaceId();
  const body = (await req.json().catch(() => null)) as { items?: Input[] } | null;
  const items = Array.isArray(body?.items) ? body.items : [];

  if (items.length === 0) {
    return NextResponse.json({ error: 'Add at least one tag.' }, { status: 400 });
  }
  if (items.length > BULK_MAX) {
    return NextResponse.json({ error: `A single import can contain at most ${BULK_MAX} rows.` }, { status: 400 });
  }

  const values: { searchTerm: string; type: TagType; tag: string }[] = [];
  for (const item of items) {
    const { error, values: v } = validate(item);
    if (error || !v) return NextResponse.json({ error }, { status: 400 });
    values.push(v);
  }

  // Insert one statement per row so duplicate terms are skipped (ON CONFLICT DO
  // NOTHING) while valid rows still land — the shape returned matches GET.
  const inserted: SearchTermTagRow[] = [];
  for (const v of values) {
    const { rows } = await query(
      `INSERT INTO search_term_tags(workspace_id,search_term,type,tag)
       VALUES($1,$2,$3,$4)
       ON CONFLICT (workspace_id, lower(search_term), lower(type)) DO NOTHING
       RETURNING id, search_term, type, tag, created_at`,
      [w, v.searchTerm, v.type, v.tag],
    );
    if (rows[0]) inserted.push(toRow(rows[0] as PgRow));
  }

  return NextResponse.json({ inserted, skipped: values.length - inserted.length });
}

export async function PATCH(req: NextRequest) {
  const w = await workspaceId();
  const body = (await req.json().catch(() => null)) as (Input & { id?: string }) | null;
  const id = body?.id ?? '';
  if (!id) return NextResponse.json({ error: 'Tag id is required.' }, { status: 400 });

  const { error, values } = validate(body ?? {});
  if (error || !values) return NextResponse.json({ error: error ?? 'Invalid tag.' }, { status: 400 });

  try {
    const { rows } = await query(
      `UPDATE search_term_tags
          SET search_term=$1, type=$2, tag=$3, updated_at=now()
        WHERE id=$4 AND workspace_id=$5
        RETURNING id, search_term, type, tag, created_at`,
      [values.searchTerm, values.type, values.tag, id, w],
    );
    if (!rows[0]) return NextResponse.json({ error: 'Tag not found.' }, { status: 404 });
    return NextResponse.json(toRow(rows[0] as PgRow));
  } catch (err) {
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'That search term is already tagged for this type.' }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest) {
  const w = await workspaceId();
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!id) return NextResponse.json({ error: 'Tag id is required.' }, { status: 400 });

  const { rowCount } = await query(`DELETE FROM search_term_tags WHERE id=$1 AND workspace_id=$2`, [id, w]);
  if (!rowCount) return NextResponse.json({ error: 'Tag not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
