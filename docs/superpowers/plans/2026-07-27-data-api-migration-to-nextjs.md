# Data API Migration: NestJS → Next.js API Routes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port `DashboardController`, `ProfitController`, `TrafficController`, `AmazonController`, `CogsController`, `DataController` from the NestJS API (`apps/api`) into Next.js API routes (`apps/web/app/api/v1/...`), delete them from `apps/api` afterward, and update the small number of real frontend call sites. `Sync` and `Health` stay in `apps/api` untouched.

**Architecture:** Each NestJS endpoint becomes a Next.js Route Handler that reads the same query params, calls the same `@amazon-profit/db` function, and returns the same JSON shape (or, for the one CSV endpoint, the same CSV bytes with the same headers). No behavior changes — this is a location move, not a rewrite.

**Tech Stack:** Next.js 16 App Router Route Handlers, `@amazon-profit/db` (already a dependency of `apps/web` since the auth migration), `csv-parse/sync`.

## Global Constraints

- No test runner exists in this repo — verification is `tsc --noEmit` plus manual `curl`/browser checks, matching the auth migration's established pattern.
- Do not run `git commit` at any step unless the user explicitly asks in the moment.
- Do not add a "Co-Authored-By: Claude" trailer to any commit in this repo, if one is made.
- Every new route must produce byte-for-byte/field-for-field identical output to its NestJS predecessor for the same inputs — this is a pure relocation, verified by direct comparison where both are running simultaneously (`apps/api` isn't deleted until the last task).
- Follow existing code style: compact, minimal whitespace, matching the style already used in `apps/web/app/api/v1/auth/*` and `apps/web/lib/auth-server.ts` from the auth migration.

---

## Task 1: Port the `workspaceId()` helper and add `csv-parse`

**Files:**
- Create: `apps/web/lib/workspace.ts`
- Modify: `apps/web/package.json`

**Interfaces:**
- Produces: `workspaceId(value?: string): string`, imported by every task below.

- [ ] **Step 1: Create the helper**

```typescript
// apps/web/lib/workspace.ts
export const workspaceId = (value?: string) => value ?? process.env.MOCK_WORKSPACE_ID ?? '00000000-0000-0000-0000-000000000101';
```

(Verbatim port of `apps/api/src/common/workspace.ts` — same default UUID, same env var.)

- [ ] **Step 2: Add `csv-parse` to `apps/web/package.json`**

In the `dependencies` block, add (matching the version already used in `apps/api/package.json`):
```json
"csv-parse": "^7.0.1",
```

- [ ] **Step 3: Install**

```bash
pnpm install
```
Expected: resolves cleanly, no errors.

---

## Task 2: Port `DashboardController` → `/api/v1/dashboard/overview`

**Files:**
- Create: `apps/web/app/api/v1/dashboard/overview/route.ts`

**Interfaces:**
- Consumes: `getOverview`, `getProfitTrend`, `getExpenseBreakdown`, `getSkuProfitability` from `@amazon-profit/db`; `workspaceId` from `@/lib/workspace` (Task 1).

- [ ] **Step 1: Write the route handler**

```typescript
// apps/web/app/api/v1/dashboard/overview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getOverview, getProfitTrend, getExpenseBreakdown, getSkuProfitability } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const w = workspaceId(req.nextUrl.searchParams.get('workspaceId') ?? undefined);
  const d = Math.min(90, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 30));
  const [summary, trend, expenses, products] = await Promise.all([
    getOverview(w, d), getProfitTrend(w, d), getExpenseBreakdown(w, d), getSkuProfitability(w, d),
  ]);
  return NextResponse.json({ summary, trend, expenses, products, period: d });
}
```

- [ ] **Step 2: Verify against the NestJS original**

Both servers are still running at this point (`apps/api` on :4000, `apps/web` on :3000):
```bash
diff <(curl -s "http://localhost:4000/v1/dashboard/overview?days=30&workspaceId=00000000-0000-0000-0000-000000000302") \
     <(curl -s "http://localhost:3000/api/v1/dashboard/overview?days=30&workspaceId=00000000-0000-0000-0000-000000000302")
```
Expected: no output (identical JSON). If the two responses differ only by field order, that's fine — pipe both through `jq -S .` (sorted keys) before diffing to confirm.

---

## Task 3: Port `ProfitController` → `/api/v1/profit/*`

**Files:**
- Create: `apps/web/app/api/v1/profit/p-and-l/route.ts`
- Create: `apps/web/app/api/v1/profit/skus/route.ts`
- Create: `apps/web/app/api/v1/profit/calculator/route.ts`
- Create: `apps/web/app/api/v1/profit/skus.csv/route.ts`

**Interfaces:**
- Consumes: `getOverview`, `getProfitTrend`, `getSkuProfitability`, `getProductEconomics` from `@amazon-profit/db`; `workspaceId` from `@/lib/workspace`.

- [ ] **Step 1: p-and-l**

```typescript
// apps/web/app/api/v1/profit/p-and-l/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getOverview, getProfitTrend } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const w = workspaceId(req.nextUrl.searchParams.get('workspaceId') ?? undefined);
  const d = Number(req.nextUrl.searchParams.get('days')) || 30;
  return NextResponse.json({ summary: await getOverview(w, d), trend: await getProfitTrend(w, d) });
}
```

- [ ] **Step 2: skus**

```typescript
// apps/web/app/api/v1/profit/skus/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSkuProfitability } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const w = workspaceId(req.nextUrl.searchParams.get('workspaceId') ?? undefined);
  const d = Number(req.nextUrl.searchParams.get('days')) || 30;
  return NextResponse.json(await getSkuProfitability(w, d));
}
```

- [ ] **Step 3: calculator**

```typescript
// apps/web/app/api/v1/profit/calculator/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getProductEconomics } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const w = workspaceId(req.nextUrl.searchParams.get('workspaceId') ?? undefined);
  const d = Number(req.nextUrl.searchParams.get('days')) || 30;
  return NextResponse.json(await getProductEconomics(w, d));
}
```

- [ ] **Step 4: skus.csv — same cell-escaping logic as the NestJS version, native `Response` instead of Express**

```typescript
// apps/web/app/api/v1/profit/skus.csv/route.ts
import { NextRequest } from 'next/server';
import { getSkuProfitability } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

const KEYS = ['sku', 'asin', 'title', 'units', 'revenue', 'amazonFees', 'adSpend', 'cogs', 'refunds', 'netProfit', 'marginPercent'] as const;
const cell = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`;

export async function GET(req: NextRequest) {
  const w = workspaceId(req.nextUrl.searchParams.get('workspaceId') ?? undefined);
  const rows = await getSkuProfitability(w, 30);
  const csv = [KEYS.join(','), ...rows.map((r) => KEYS.map((k) => cell((r as any)[k])).join(','))].join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="sku-profitability.csv"',
    },
  });
}
```

- [ ] **Step 5: Verify all four against the NestJS originals**

```bash
diff <(curl -s "http://localhost:4000/v1/profit/p-and-l?days=30&workspaceId=00000000-0000-0000-0000-000000000302" | jq -S .) \
     <(curl -s "http://localhost:3000/api/v1/profit/p-and-l?days=30&workspaceId=00000000-0000-0000-0000-000000000302" | jq -S .)
diff <(curl -s "http://localhost:4000/v1/profit/skus?days=30&workspaceId=00000000-0000-0000-0000-000000000302" | jq -S .) \
     <(curl -s "http://localhost:3000/api/v1/profit/skus?days=30&workspaceId=00000000-0000-0000-0000-000000000302" | jq -S .)
diff <(curl -s "http://localhost:4000/v1/profit/calculator?days=30&workspaceId=00000000-0000-0000-0000-000000000302" | jq -S .) \
     <(curl -s "http://localhost:3000/api/v1/profit/calculator?days=30&workspaceId=00000000-0000-0000-0000-000000000302" | jq -S .)
diff <(curl -s "http://localhost:4000/v1/profit/skus.csv?workspaceId=00000000-0000-0000-0000-000000000302") \
     <(curl -s "http://localhost:3000/api/v1/profit/skus.csv?workspaceId=00000000-0000-0000-0000-000000000302")
```
Expected: no output for all four.

---

## Task 4: Port `TrafficController` → `/api/v1/traffic/raw`

**Files:**
- Create: `apps/web/app/api/v1/traffic/raw/route.ts`

**Interfaces:**
- Consumes: `getTrafficRaw` from `@amazon-profit/db`; `workspaceId` from `@/lib/workspace`.

- [ ] **Step 1: Write the route handler**

```typescript
// apps/web/app/api/v1/traffic/raw/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTrafficRaw } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const w = workspaceId(req.nextUrl.searchParams.get('workspaceId') ?? undefined);
  const d = Math.min(90, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 30));
  return NextResponse.json(await getTrafficRaw(w, d));
}
```

- [ ] **Step 2: Verify against the NestJS original**

```bash
diff <(curl -s "http://localhost:4000/v1/traffic/raw?days=30&workspaceId=00000000-0000-0000-0000-000000000302" | jq -S .) \
     <(curl -s "http://localhost:3000/api/v1/traffic/raw?days=30&workspaceId=00000000-0000-0000-0000-000000000302" | jq -S .)
```
Expected: no output.

---

## Task 5: Port `AmazonController` → `/api/v1/amazon/connections/*`

**Files:**
- Create: `apps/web/app/api/v1/amazon/connections/route.ts`
- Create: `apps/web/app/api/v1/amazon/connections/seller-central/mock/route.ts`
- Create: `apps/web/app/api/v1/amazon/connections/ads/mock/route.ts`

**Interfaces:**
- Consumes: `listTable`, `query` from `@amazon-profit/db`; `workspaceId` from `@/lib/workspace`.

- [ ] **Step 1: GET list**

```typescript
// apps/web/app/api/v1/amazon/connections/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { listTable } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const w = workspaceId(req.nextUrl.searchParams.get('workspaceId') ?? undefined);
  return NextResponse.json(await listTable('amazon_accounts', w));
}
```

- [ ] **Step 2: POST seller-central/mock**

```typescript
// apps/web/app/api/v1/amazon/connections/seller-central/mock/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function POST(req: NextRequest) {
  const w = workspaceId(req.nextUrl.searchParams.get('workspaceId') ?? undefined);
  const a = process.env.MOCK_AMAZON_ACCOUNT_ID ?? '00000000-0000-0000-0000-000000000201';
  await query(
    `INSERT INTO amazon_accounts(id,workspace_id,seller_id,display_name,status,provider_mode,connected_at) VALUES($1,$2,'A1MOCKSELLER','Amazon.com — Mock','connected','mock',now()) ON CONFLICT(id) DO UPDATE SET status='connected',connected_at=now()`,
    [a, w],
  );
  return NextResponse.json({ id: a, status: 'connected', mode: 'mock' });
}
```

- [ ] **Step 3: POST ads/mock**

```typescript
// apps/web/app/api/v1/amazon/connections/ads/mock/route.ts
import { NextResponse } from 'next/server';
import { query } from '@amazon-profit/db';

export async function POST() {
  const a = process.env.MOCK_AMAZON_ACCOUNT_ID ?? '00000000-0000-0000-0000-000000000201';
  await query(
    `INSERT INTO amazon_ad_accounts(amazon_account_id,profile_id,display_name,status,connected_at) VALUES($1,'999999999999','Amazon Ads — Mock','connected',now())`,
    [a],
  );
  return NextResponse.json({ status: 'connected', mode: 'mock' });
}
```

- [ ] **Step 4: Verify the GET against the NestJS original**

```bash
diff <(curl -s "http://localhost:4000/v1/amazon/connections?workspaceId=00000000-0000-0000-0000-000000000302" | jq -S .) \
     <(curl -s "http://localhost:3000/api/v1/amazon/connections?workspaceId=00000000-0000-0000-0000-000000000302" | jq -S .)
```
Expected: no output. (Don't call the two POST mock endpoints against real data in this verification step — they write rows with a fixed mock ID; calling both the NestJS and Next.js versions back-to-back would just upsert the same row twice, which is harmless but not a meaningful diff. Confirm each returns `{"status":"connected","mode":"mock"}` / `{"id":...,"status":"connected","mode":"mock"}` individually instead.)

---

## Task 6: Port `CogsController` → `/api/v1/cogs/*`

**Files:**
- Create: `apps/web/app/api/v1/cogs/route.ts`
- Create: `apps/web/app/api/v1/cogs/upload/route.ts`

**Interfaces:**
- Consumes: `listTable`, `query` from `@amazon-profit/db`; `workspaceId` from `@/lib/workspace`; `parse` from `csv-parse/sync` (Task 1).
- Produces: an internal `saveCogsRow` function in `route.ts`, exported so `upload/route.ts` can import and reuse it instead of duplicating the insert SQL (the NestJS version called `this.save(...)` from `upload()`; Route Handlers have no controller instance to call, so this becomes a plain exported function).

- [ ] **Step 1: GET list + POST save**

```typescript
// apps/web/app/api/v1/cogs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { listTable, query } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const w = workspaceId(req.nextUrl.searchParams.get('workspaceId') ?? undefined);
  return NextResponse.json(await listTable('cogs_history', w));
}

export type CogsRowInput = {
  sku: string; effectiveFrom: string; effectiveTo?: string | null; unitCogs: number;
  inboundFreightPerUnit?: number; customsPerUnit?: number; prepFeePerUnit?: number; notes?: string | null;
};

export async function saveCogsRow(b: CogsRowInput, workspaceIdParam?: string) {
  const w = workspaceId(workspaceIdParam);
  const { rows } = await query(
    `INSERT INTO cogs_history(workspace_id,sku,effective_from,effective_to,unit_cogs,inbound_freight_per_unit,customs_per_unit,prep_fee_per_unit,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(workspace_id,sku,effective_from) DO UPDATE SET effective_to=excluded.effective_to,unit_cogs=excluded.unit_cogs,inbound_freight_per_unit=excluded.inbound_freight_per_unit,customs_per_unit=excluded.customs_per_unit,prep_fee_per_unit=excluded.prep_fee_per_unit,notes=excluded.notes,updated_at=now() RETURNING *`,
    [w, b.sku, b.effectiveFrom, b.effectiveTo ?? null, b.unitCogs, b.inboundFreightPerUnit ?? 0, b.customsPerUnit ?? 0, b.prepFeePerUnit ?? 0, b.notes ?? null],
  );
  return rows[0];
}

export async function POST(req: NextRequest) {
  const b = (await req.json()) as CogsRowInput;
  const w = req.nextUrl.searchParams.get('workspaceId') ?? undefined;
  return NextResponse.json(await saveCogsRow(b, w));
}
```

- [ ] **Step 2: POST upload (native `formData()` instead of multer)**

```typescript
// apps/web/app/api/v1/cogs/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import { saveCogsRow } from '../route';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ message: 'No file provided' }, { status: 400 });
  const text = await file.text();
  const rows = parse(text, { columns: true, skip_empty_lines: true, trim: true }) as any[];
  const w = req.nextUrl.searchParams.get('workspaceId') ?? undefined;
  for (const r of rows) {
    await saveCogsRow(
      {
        sku: r.sku, effectiveFrom: r.effective_from, unitCogs: Number(r.unit_cogs),
        inboundFreightPerUnit: Number(r.inbound_freight_per_unit ?? 0),
        customsPerUnit: Number(r.customs_per_unit ?? 0),
        prepFeePerUnit: Number(r.prep_fee_per_unit ?? 0),
      },
      w,
    );
  }
  return NextResponse.json({ imported: rows.length });
}
```

- [ ] **Step 3: Verify GET list against the NestJS original**

```bash
diff <(curl -s "http://localhost:4000/v1/cogs?workspaceId=00000000-0000-0000-0000-000000000302" | jq -S .) \
     <(curl -s "http://localhost:3000/api/v1/cogs?workspaceId=00000000-0000-0000-0000-000000000302" | jq -S .)
```
Expected: no output.

- [ ] **Step 4: Verify POST save**

```bash
curl -s -X POST "http://localhost:3000/api/v1/cogs?workspaceId=00000000-0000-0000-0000-000000000302" \
  -H "Content-Type: application/json" \
  -d '{"sku":"TEST-SKU-MIGRATION","effectiveFrom":"2026-01-01","unitCogs":5.5}'
```
Expected: `200` with the inserted row JSON (including `id`, `workspace_id`, `sku`, `unit_cogs`).

- [ ] **Step 5: Verify POST upload with a real multipart file**

```bash
printf 'sku,effective_from,unit_cogs\nTEST-SKU-UPLOAD,2026-01-01,7.25\n' > /tmp/claude-1000/scratchpad/cogs-test.csv
curl -s -X POST "http://localhost:3000/api/v1/cogs/upload?workspaceId=00000000-0000-0000-0000-000000000302" \
  -F "file=@/tmp/claude-1000/scratchpad/cogs-test.csv"
```
Expected: `{"imported":1}`.

- [ ] **Step 6: Clean up test rows**

```bash
DBURL=$(grep "^DATABASE_URL=" /home/ameera/Downloads/SAAS-professional_profit/.env | cut -d= -f2-)
psql "$DBURL" -c "DELETE FROM cogs_history WHERE sku IN ('TEST-SKU-MIGRATION','TEST-SKU-UPLOAD');"
```

---

## Task 7: Port `DataController` → `/api/v1/{orders,refunds,alerts,ppc/summary}`

**Files:**
- Create: `apps/web/app/api/v1/orders/route.ts`
- Create: `apps/web/app/api/v1/refunds/route.ts`
- Create: `apps/web/app/api/v1/alerts/route.ts`
- Create: `apps/web/app/api/v1/ppc/summary/route.ts`

**Interfaces:**
- Consumes: `listTable`, `query` from `@amazon-profit/db`; `workspaceId` from `@/lib/workspace`.

- [ ] **Step 1: orders**

```typescript
// apps/web/app/api/v1/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { listTable } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const w = workspaceId(req.nextUrl.searchParams.get('workspaceId') ?? undefined);
  return NextResponse.json(await listTable('orders', w));
}
```

- [ ] **Step 2: refunds**

```typescript
// apps/web/app/api/v1/refunds/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { listTable } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const w = workspaceId(req.nextUrl.searchParams.get('workspaceId') ?? undefined);
  return NextResponse.json(await listTable('refunds', w));
}
```

- [ ] **Step 3: alerts**

```typescript
// apps/web/app/api/v1/alerts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { listTable } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const w = workspaceId(req.nextUrl.searchParams.get('workspaceId') ?? undefined);
  return NextResponse.json(await listTable('alerts', w));
}
```

- [ ] **Step 4: ppc/summary**

```typescript
// apps/web/app/api/v1/ppc/summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@amazon-profit/db';
import { workspaceId } from '@/lib/workspace';

export async function GET(req: NextRequest) {
  const w = workspaceId(req.nextUrl.searchParams.get('workspaceId') ?? undefined);
  const days = Number(req.nextUrl.searchParams.get('days')) || 30;
  const { rows } = await query<any>(
    `SELECT COALESCE(SUM(a.spend),0) spend,COALESCE(SUM(a.attributed_sales),0) sales,COALESCE(SUM(a.impressions),0) impressions,COALESCE(SUM(a.clicks),0) clicks,COALESCE(SUM(a.attributed_orders),0) orders,COALESCE(SUM(a.spend) FILTER(WHERE a.product_id IS NULL),0) unattributed FROM ad_spend_daily a JOIN amazon_accounts aa ON aa.id=a.amazon_account_id WHERE aa.workspace_id=$1 AND a.date>=current_date-($2::int-1)`,
    [w, days],
  );
  const r = rows[0] ?? {};
  const spend = Number(r.spend), sales = Number(r.sales), clicks = Number(r.clicks), impressions = Number(r.impressions);
  return NextResponse.json({
    spend, sales, acosPercent: sales ? (spend / sales) * 100 : 0, roas: spend ? sales / spend : 0,
    clicks, impressions, ctrPercent: impressions ? (clicks / impressions) * 100 : 0, cpc: clicks ? spend / clicks : 0,
    orders: Number(r.orders), unattributedSpend: Number(r.unattributed),
  });
}
```

- [ ] **Step 5: Verify all four against the NestJS originals**

```bash
diff <(curl -s "http://localhost:4000/v1/orders?workspaceId=00000000-0000-0000-0000-000000000302" | jq -S .) \
     <(curl -s "http://localhost:3000/api/v1/orders?workspaceId=00000000-0000-0000-0000-000000000302" | jq -S .)
diff <(curl -s "http://localhost:4000/v1/refunds?workspaceId=00000000-0000-0000-0000-000000000302" | jq -S .) \
     <(curl -s "http://localhost:3000/api/v1/refunds?workspaceId=00000000-0000-0000-0000-000000000302" | jq -S .)
diff <(curl -s "http://localhost:4000/v1/alerts?workspaceId=00000000-0000-0000-0000-000000000302" | jq -S .) \
     <(curl -s "http://localhost:3000/api/v1/alerts?workspaceId=00000000-0000-0000-0000-000000000302" | jq -S .)
diff <(curl -s "http://localhost:4000/v1/ppc/summary?days=30&workspaceId=00000000-0000-0000-0000-000000000302" | jq -S .) \
     <(curl -s "http://localhost:3000/api/v1/ppc/summary?days=30&workspaceId=00000000-0000-0000-0000-000000000302" | jq -S .)
```
Expected: no output for all four.

---

## Task 8: Point the frontend at the new same-origin routes and remove dead code

**Files:**
- Modify: `apps/web/lib/api.ts`
- Modify: `apps/web/app/(dashboard)/sku-profitability/page.tsx`

**Interfaces:**
- No signature changes to `fetchDashboardOverview`, `fetchProfitCalculator`, `fetchTrafficRaw` — only the path string passed to `getReal()` changes.

- [ ] **Step 1: Rewrite `apps/web/lib/api.ts`**

Replace the entire file (this removes `overviewData`, `skuData`, the unused `safe()` helper, and the `./mock` import, and updates the three real paths):

```typescript
const DEMO_WORKSPACE_ID = '00000000-0000-0000-0000-000000000302';

export type DashboardOverviewResponse = {
  summary: { revenue: number; profit: number; adSpend: number; refunds: number; units: number; cogs: number; marginPercent: number; tacosPercent: number; roiPercent: number };
  trend: { date: string; revenue: number; profit: number; adSpend: number }[];
  expenses: { total: number; items: { name: string; amount: number; pct: number }[] };
  products: { sku: string; asin: string; title: string; units: number; revenue: number; amazonFees: number; adSpend: number; cogs: number; refunds: number; netProfit: number; marginPercent: number }[];
  period: number;
};
export type ProfitCalculatorRow = { id: string; sku: string; asin: string; title: string; units: number; revenue: number; avgPrice: number; fbaFee: number; referralPct: number; referralAmt: number; cogsPerUnit: number; storageFeePerUnit: number; refundRate: number; marketingPct: number; profit: number; marginPct: number };
export type TrafficRawRow = { productId: string; sku: string; asin: string; title: string; date: string; units: number; revenue: number; adSpend: number; organicSessions: number; paidSessions: number };

async function getReal<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${path}${path.includes('?') ? '&' : '?'}workspaceId=${DEMO_WORKSPACE_ID}`, { cache: 'no-store' });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

export const fetchDashboardOverview = (days: number) => getReal<DashboardOverviewResponse>(`/api/v1/dashboard/overview?days=${days}`);
export const fetchProfitCalculator = (days: number) => getReal<ProfitCalculatorRow[]>(`/api/v1/profit/calculator?days=${days}`);
export const fetchTrafficRaw = (days: number) => getReal<TrafficRawRow[]>(`/api/v1/traffic/raw?days=${days}`);

export type EmailCheck = { exists: boolean; providers: string[] };
export async function checkEmail(email: string): Promise<EmailCheck> {
  try {
    const r = await fetch(`/api/v1/auth/check-email?email=${encodeURIComponent(email)}`, { cache: 'no-store' });
    return r.ok ? ((await r.json()) as EmailCheck) : { exists: false, providers: [] };
  } catch {
    return { exists: false, providers: [] };
  }
}
```

- [ ] **Step 2: Fix the SKU CSV export link**

In `apps/web/app/(dashboard)/sku-profitability/page.tsx`, change:
```typescript
<a href={`${process.env.NEXT_PUBLIC_API_URL??'http://localhost:4000'}/v1/profit/skus.csv`}>Export CSV</a>
```
to:
```typescript
<a href="/api/v1/profit/skus.csv">Export CSV</a>
```

- [ ] **Step 3: Typecheck**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -v "TS5101\|aka.ms"
```
Expected: no errors.

- [ ] **Step 4: Verify in the browser**

Visit `http://localhost:3000/dashboard` — should show real numbers (not skeleton, not the error banner). Visit `http://localhost:3000/profit-calculator` and `http://localhost:3000/traffic-analytics` — same. Visit `http://localhost:3000/sku-profitability` and click "Export CSV" — should download a real CSV (the table itself still shows hardcoded mock data, that's expected and out of scope per the design).

---

## Task 9: Delete the six controllers from `apps/api`

**Files:**
- Delete: `apps/api/src/dashboard/`
- Delete: `apps/api/src/profit/`
- Delete: `apps/api/src/traffic/`
- Delete: `apps/api/src/amazon/`
- Delete: `apps/api/src/cogs/`
- Delete: `apps/api/src/routes/` (contains only `data.controller.ts`)
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Delete the six controller directories**

```bash
rm -rf apps/api/src/dashboard apps/api/src/profit apps/api/src/traffic apps/api/src/amazon apps/api/src/cogs apps/api/src/routes
```

- [ ] **Step 2: Rewrite `app.module.ts`** to keep only Health and Sync:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller.js';
import { SyncController, SyncQueueService } from './sync/sync.controller.js';
@Module({
  imports:[
    ConfigModule.forRoot({isGlobal:true,envFilePath:['../../.env','.env']}),
  ],
  controllers:[HealthController,SyncController],
  providers:[SyncQueueService]
})
export class AppModule{}
```

- [ ] **Step 3: Typecheck**

```bash
cd apps/api && npx tsc -p tsconfig.json --noEmit 2>&1 | grep -v "queue/redis.ts\|has no construct signatures"
```
Expected: no errors. (The `ioredis` constructor error filtered out here is a pre-existing, unrelated issue confirmed during the auth migration — not something this task introduces or should fix.)

Also confirm nothing under `apps/api/src` still imports `@amazon-profit/utils`' `getDateRange` or any now-deleted controller:
```bash
grep -rn "from '\.\./dashboard\|from '\.\./profit\|from '\.\./traffic\|from '\.\./amazon\|from '\.\./cogs\|from '\.\./routes" apps/api/src
```
Expected: no output.

- [ ] **Step 4: Restart `apps/api` and confirm it boots**

Ask the user to restart their `apps/api` dev server (do not start a competing background instance — this repeats the exact situation from the auth migration, where deleting watched files crashed `tsx watch`). Then:
```bash
curl -s http://localhost:4000/v1/health
```
Expected: a successful health-check response.

- [ ] **Step 5: Confirm Sync still works unchanged**

```bash
curl -s -X POST http://localhost:4000/v1/sync
curl -s http://localhost:4000/v1/sync/history
```
Expected: both still respond as they did before this migration (job queued / history list) — this task touched `app.module.ts` but not `sync.controller.ts` or `queue/redis.ts`, so this is a regression check, not new functionality.

- [ ] **Step 6: Final full re-verification of the moved routes now that `apps/api` no longer serves them**

Re-run the browser checks from Task 8 Step 4 one more time — `/dashboard`, `/profit-calculator`, `/traffic-analytics`, `/sku-profitability`'s CSV export — to confirm `apps/web` was never actually depending on `apps/api` for these once Task 8 landed, and everything still works with `apps/api`'s copies gone.
