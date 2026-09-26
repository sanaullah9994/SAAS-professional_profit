'use client';
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Download, ExternalLink, PlayCircle, Search, Upload, PencilLine } from 'lucide-react';
import { cn } from '@amazon-profit/utils';
import { fetchProducts, saveCogs, setProductActive, type ProductRow } from '@/lib/api';

type Product = { id: string; title: string; sku: string; asin: string; status: 'Active' | 'Inactive'; cogs: number };

const toProduct = (p: ProductRow): Product => ({ id: p.id, title: p.title, sku: p.sku, asin: p.asin, status: p.active ? 'Active' : 'Inactive', cogs: p.cogs });
const initials = (title: string) => title.slice(0, 2).toUpperCase();

type SortKey = 'item' | 'status' | 'cogs';

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('pp-skeleton', className)} />;
}

export function ProductsCogsPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('item');
  const [sortDir, setSortDir] = useState(1);
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchProducts().then((rows) => {
      if (cancelled) return;
      setProducts((rows ?? []).map(toProduct));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function setSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => -d);
    else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  function startEdit(id: string, cur: number) {
    setEditId(id);
    setEditValue(cur.toFixed(2));
  }

  function saveEdit(id: string, sku: string) {
    const v = parseFloat(editValue);
    setEditId(null);
    setEditValue('');
    if (isNaN(v)) return;
    const prev = products.find((p) => p.id === id)?.cogs;
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, cogs: v } : p)));
    saveCogs(sku, v).then((ok) => {
      if (!ok && prev !== undefined) setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, cogs: prev } : p)));
    });
  }

  function toggleStatus(id: string, cur: 'Active' | 'Inactive') {
    const next = cur === 'Active' ? 'Inactive' : 'Active';
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, status: next } : p)));
    setProductActive(id, next === 'Active').then((ok) => {
      if (!ok) setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, status: cur } : p)));
    });
  }

  const q = search.trim().toLowerCase();
  const filtered = products.filter((p) => !q || p.title.toLowerCase().includes(q) || p.asin.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));

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
            placeholder="Search by a Title, ASIN, SKU…"
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
                      ASIN: {p.asin} / SKU: {p.sku}
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
                            if (e.key === 'Enter') saveEdit(p.id, p.sku);
                            if (e.key === 'Escape') {
                              setEditId(null);
                              setEditValue('');
                            }
                          }}
                          className="w-24 rounded-lg border-[1.5px] border-primary bg-card py-2 pl-5.5 pr-2.5 text-sm font-bold text-foreground outline-none"
                        />
                      </div>
                      <button
                        onClick={() => saveEdit(p.id, p.sku)}
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
