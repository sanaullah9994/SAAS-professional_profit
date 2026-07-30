'use client';
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Download, ExternalLink, PlayCircle, Search, Upload, PencilLine } from 'lucide-react';
import { cn } from '@amazon-profit/utils';

type Product = { id: number; title: string; child: string; sku: string; status: 'Active' | 'Inactive'; cogs: number };

// TODO: replace with products fetched from the connected account / DB
const CATALOG: Product[] = [
  { id: 1, title: 'XEELA Plant Based Vegan Protein Powder - Chocolate', child: 'B0CCYY7KR8', sku: 'XL-PROT-CHOC', status: 'Active', cogs: 8.4 },
  { id: 2, title: 'XEELA Plant Based Vegan Protein Powder - Vanilla', child: 'B0CCYY7KR8', sku: 'XL-PROT-VAN-FBA', status: 'Inactive', cogs: 8.4 },
  { id: 3, title: 'XEELA Pre Workout Powder - Blue Raspberry', child: 'B0C680KZV1', sku: 'XL-PRE-BLUE', status: 'Active', cogs: 4.15 },
  { id: 4, title: 'XEELA Pre Workout Powder - Tropical', child: 'B0C680KZV1', sku: 'XL-PRE-TROP-FBM', status: 'Inactive', cogs: 4.15 },
  { id: 5, title: 'XEELA Creatine Monohydrate (Unflavored)', child: 'B0CCMCRX6Q', sku: 'XL-CRE-UNF', status: 'Active', cogs: 6.2 },
  { id: 6, title: 'XEELA Apple Cider Vinegar Capsules w/ The Mother', child: 'B0CDXZZK8B', sku: 'XL-ACV-120', status: 'Active', cogs: 3.75 },
  { id: 7, title: 'XEELA BCAA Amino Energy Powder - Citrus', child: 'B0CN1YAB2K', sku: 'XL-BCAA-CIT', status: 'Inactive', cogs: 5.05 },
  { id: 8, title: 'XEELA Greens Super Blend - 30 Servings', child: 'B0E1KXX730', sku: 'XL-GRN-30', status: 'Active', cogs: 7.1 },
];

const initials = (title: string) => title.replace(/^XEELA\s*/i, '').slice(0, 2).toUpperCase();

type SortKey = 'item' | 'status' | 'cogs';

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('pp-skeleton', className)} />;
}

export function ProductsCogsPage() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('item');
  const [sortDir, setSortDir] = useState(1);
  const [editId, setEditId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [overrides, setOverrides] = useState<Record<number, number>>({});
  const [statusOverrides, setStatusOverrides] = useState<Record<number, 'Active' | 'Inactive'>>({});

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1100);
    return () => clearTimeout(t);
  }, []);

  function setSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => -d);
    else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  function startEdit(id: number, cur: number) {
    setEditId(id);
    setEditValue(cur.toFixed(2));
  }

  function saveEdit(id: number) {
    const v = parseFloat(editValue);
    if (!isNaN(v)) setOverrides((o) => ({ ...o, [id]: v }));
    setEditId(null);
    setEditValue('');
  }

  function toggleStatus(id: number, cur: 'Active' | 'Inactive') {
    setStatusOverrides((s) => ({ ...s, [id]: cur === 'Active' ? 'Inactive' : 'Active' }));
  }

  const data = CATALOG.map((p) => ({
    ...p,
    cogs: overrides[p.id] ?? p.cogs,
    status: statusOverrides[p.id] ?? p.status,
  }));

  const q = search.trim().toLowerCase();
  const filtered = data.filter((p) => !q || p.title.toLowerCase().includes(q) || p.child.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));

  filtered.sort((a, b) => {
    let av: string | number;
    let bv: string | number;
    if (sortKey === 'item') {
      av = a.title.toLowerCase();
      bv = b.title.toLowerCase();
    } else if (sortKey === 'status') {
      av = a.status;
      bv = b.status;
    } else {
      av = a.cogs;
      bv = b.cogs;
    }
    return (av < bv ? -1 : av > bv ? 1 : 0) * sortDir;
  });

  const Arrow = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="size-3 text-muted-foreground/50" />;
    return sortDir === 1 ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />;
  };

  const activeCount = filtered.filter((p) => p.status === 'Active').length;
  const avg = filtered.length ? filtered.reduce((a, p) => a + p.cogs, 0) / filtered.length : 0;

  return (
    <div>
      <div className="mb-5.5 flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <h1 className="text-[26px] font-extrabold tracking-tight">Products &amp; COGS</h1>
          <a href="#" className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground transition hover:text-primary">
            <PlayCircle className="size-[15px]" />
            Video guide
          </a>
        </div>
        <a href="#" className="flex items-center gap-1.5 text-[13.5px] font-bold text-primary transition hover:opacity-80">
          Import history
          <ExternalLink className="size-3.5" />
        </a>
      </div>

      <div className="mb-4.5 flex flex-wrap items-center gap-3.5">
        <div className="relative min-w-[260px] max-w-[560px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by a Title, Parent, Child, SKU…"
            className="w-full rounded-xl border border-border bg-card py-3.5 pl-10 pr-3.5 text-sm font-medium text-foreground outline-none focus:border-primary"
          />
        </div>
        <div className="ml-auto flex gap-2.5">
          <button className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-bold text-foreground/80 transition hover:border-primary hover:text-primary">
            <Download className="size-4" />
            Export
          </button>
          <button className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-bold text-foreground/80 transition hover:border-primary hover:text-primary">
            <Upload className="size-4" />
            Import
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-5.5">
          <Skeleton className="mb-3.5 h-[34px] w-full" />
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="mb-2.5 h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-[minmax(320px,1fr)_150px_190px] items-center border-b border-border px-6 py-4">
            <button onClick={() => setSort('item')} className="flex items-center gap-1.5 justify-self-start text-[11px] font-bold uppercase tracking-wide text-muted-foreground transition hover:text-foreground">
              Item <Arrow column="item" />
            </button>
            <button onClick={() => setSort('status')} className="flex items-center gap-1.5 justify-self-start text-[11px] font-bold uppercase tracking-wide text-muted-foreground transition hover:text-foreground">
              Status <Arrow column="status" />
            </button>
            <button onClick={() => setSort('cogs')} className="flex items-center gap-1.5 justify-self-start text-[11px] font-bold uppercase tracking-wide text-muted-foreground transition hover:text-foreground">
              COGS <Arrow column="cogs" />
            </button>
          </div>

          {filtered.map((p) => {
            const editing = editId === p.id;
            const active = p.status === 'Active';
            return (
              <div key={p.id} className="grid grid-cols-[minmax(320px,1fr)_150px_190px] items-center border-b border-border/60 px-6 py-4 transition hover:bg-muted/20 last:border-b-0">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex size-[52px] shrink-0 items-center justify-center rounded-[11px] border border-border bg-muted/40 text-[13px] font-extrabold text-muted-foreground/40">
                    {initials(p.title)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[14.5px] font-bold text-foreground">{p.title}</div>
                    <div className="mt-0.5 truncate text-[11.5px] font-semibold text-muted-foreground">
                      CHILD: {p.child} / SKU: {p.sku}
                    </div>
                  </div>
                </div>
                <div className="justify-self-start">
                  <button
                    onClick={() => toggleStatus(p.id, p.status)}
                    className={cn(
                      'rounded-lg px-3.5 py-1.5 text-[12.5px] font-extrabold transition hover:brightness-95',
                      active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {p.status}
                  </button>
                </div>
                <div className="flex items-center gap-2.5 justify-self-start">
                  {editing ? (
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">$</span>
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value.replace(/[^0-9.]/g, ''))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(p.id);
                            if (e.key === 'Escape') {
                              setEditId(null);
                              setEditValue('');
                            }
                          }}
                          className="w-24 rounded-lg border-[1.5px] border-primary bg-card py-2 pl-5.5 pr-2.5 text-sm font-bold text-foreground outline-none"
                        />
                      </div>
                      <button
                        onClick={() => saveEdit(p.id)}
                        className="flex size-[34px] items-center justify-center rounded-lg bg-primary transition hover:opacity-90"
                      >
                        <Check className="size-4 text-primary-foreground" strokeWidth={2.4} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-base font-extrabold tracking-tight text-primary">${p.cogs.toFixed(2)}</span>
                      <button
                        onClick={() => startEdit(p.id, p.cogs)}
                        className="flex size-[30px] shrink-0 items-center justify-center rounded-lg border border-border bg-card transition hover:border-primary"
                      >
                        <PencilLine className="size-[15px] text-muted-foreground" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-12 text-center text-sm font-semibold text-muted-foreground">No products match your search.</div>
          )}

          {filtered.length > 0 && (
            <div className="flex items-center justify-between gap-4 bg-muted/20 px-6 py-4 text-[13px] font-bold text-foreground/80">
              <span>
                {filtered.length} product{filtered.length === 1 ? '' : 's'} · {activeCount} active
              </span>
              <span>
                Avg COGS <span className="font-extrabold text-foreground">${avg.toFixed(2)}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
