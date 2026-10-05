'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Loader2, Pencil, Plus, Search, Tag, Trash2, Upload, X } from 'lucide-react';
import { Badge, Button, Card, CardContent, Input } from '@amazon-profit/ui';
import { PageHeader } from '@/components/dashboard';
import {
  createSearchTermTags,
  deleteSearchTermTag,
  fetchSearchTermTags,
  updateSearchTermTag,
  type SearchTermTagInput,
  type SearchTermTagRow,
  type TagType,
} from '@/lib/api';

const TAG_TYPES: TagType[] = ['Exact', 'Phrase', 'Broad'];
const TERM_MAX = 128;
const TAG_MAX = 40;

type ModalState = { mode: 'create' } | { mode: 'edit'; row: SearchTermTagRow };
type FormState = { searchTerm: string; type: TagType; tag: string };

const emptyForm = (): FormState => ({ searchTerm: '', type: 'Phrase', tag: '' });
const formFromRow = (row: SearchTermTagRow): FormState => ({ searchTerm: row.searchTerm, type: row.type, tag: row.tag });

const selectClass =
  'flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ring';

const csvEscape = (value: string) => (/[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

const normalizeType = (raw: string): TagType | null => {
  const v = raw.trim().toLowerCase();
  if (v === 'exact') return 'Exact';
  if (v === 'phrase') return 'Phrase';
  if (v === 'broad') return 'Broad';
  return null;
};

function SkeletonRow() {
  return (
    <tr className="border-b border-border">
      <td className="p-4"><div className="pp-skeleton h-4 w-56" /></td>
      <td className="p-4"><div className="pp-skeleton h-5 w-16 rounded-full" /></td>
      <td className="p-4"><div className="pp-skeleton h-5 w-24 rounded-full" /></td>
      <td className="p-4"><div className="pp-skeleton ml-auto h-8 w-20" /></td>
    </tr>
  );
}

export function SearchTermTagsPage() {
  const [rows, setRows] = useState<SearchTermTagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<SearchTermTagRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const data = await fetchSearchTermTags();
    if (data === null) {
      setLoadError('We could not load your search term tags. Please refresh the page.');
    } else {
      setLoadError(null);
      setRows(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!modal && !deleteTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || saving || deleting) return;
      setModal(null);
      setDeleteTarget(null);
      setFormError(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, deleteTarget, saving, deleting]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () => (!q ? rows : rows.filter((r) => r.tag.toLowerCase().includes(q) || r.searchTerm.toLowerCase().includes(q))),
    [rows, q],
  );

  const existingTags = useMemo(
    () => Array.from(new Set(rows.map((r) => r.tag))).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
    setNotice(null);
    setModal({ mode: 'create' });
  };

  const openEdit = (row: SearchTermTagRow) => {
    setForm(formFromRow(row));
    setFormError(null);
    setNotice(null);
    setModal({ mode: 'edit', row });
  };

  const closeModal = () => {
    if (saving) return;
    setModal(null);
    setFormError(null);
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (formError) setFormError(null);
  };

  const submit = async () => {
    const searchTerm = form.searchTerm.trim();
    const tag = form.tag.trim();
    if (!searchTerm) return setFormError('Enter a search term.');
    if (searchTerm.length > TERM_MAX) return setFormError(`Search term must be ${TERM_MAX} characters or fewer.`);
    if (!tag) return setFormError('Enter a tag.');
    if (tag.length > TAG_MAX) return setFormError(`Tag must be ${TAG_MAX} characters or fewer.`);

    const input: SearchTermTagInput = { searchTerm, type: form.type, tag };

    setSaving(true);
    setFormError(null);
    const result =
      modal?.mode === 'edit' ? await updateSearchTermTag(modal.row.id, input) : await createSearchTermTags([input]);

    if (!result.ok) {
      setFormError(result.error ?? 'Something went wrong. Please try again.');
      setSaving(false);
      return;
    }

    if (modal?.mode === 'edit' && result.row) {
      const saved = result.row;
      setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    } else {
      await load();
    }
    setSaving(false);
    setModal(null);
    setFormError(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteSearchTermTag(deleteTarget.id);
    if (!result.ok) {
      setFormError(result.error ?? 'Could not delete this tag. Please try again.');
      setDeleting(false);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
    setFormError(null);
  };

  const exportCsv = () => {
    const header = 'search_term,type,tag';
    const body = rows.map((r) => [r.searchTerm, r.type, r.tag].map(csvEscape).join(','));
    const csv = [header, ...body].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'search-term-tags.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importCsv = async (file: File) => {
    setImporting(true);
    setNotice(null);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        setNotice({ kind: 'error', text: 'That file has no rows to import.' });
        return;
      }

      const first = parsed[0].map((c) => c.trim().toLowerCase());
      const hasHeader = first[0]?.includes('search') && first[1] === 'type' && first[2] === 'tag';
      const dataRows = hasHeader ? parsed.slice(1) : parsed;

      const items: SearchTermTagInput[] = [];
      let invalid = 0;
      for (const cells of dataRows) {
        const searchTerm = (cells[0] ?? '').trim();
        const type = normalizeType(cells[1] ?? '');
        const tag = (cells[2] ?? '').trim();
        if (!searchTerm || !type || !tag || searchTerm.length > TERM_MAX || tag.length > TAG_MAX) {
          invalid++;
          continue;
        }
        items.push({ searchTerm, type, tag });
      }

      if (items.length === 0) {
        setNotice({ kind: 'error', text: 'No valid rows found. Use columns: search_term, type, tag.' });
        return;
      }

      const result = await createSearchTermTags(items);
      if (!result.ok) {
        setNotice({ kind: 'error', text: result.error ?? 'Import failed. Please try again.' });
        return;
      }

      await load();
      const parts = [`Imported ${result.inserted ?? 0} tag${(result.inserted ?? 0) === 1 ? '' : 's'}`];
      if (result.skipped) parts.push(`${result.skipped} duplicate${result.skipped === 1 ? '' : 's'} skipped`);
      if (invalid) parts.push(`${invalid} invalid row${invalid === 1 ? '' : 's'} ignored`);
      setNotice({ kind: 'success', text: `${parts.join(' · ')}.` });
    } catch {
      setNotice({ kind: 'error', text: 'Could not read that file. Please upload a CSV.' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <PageHeader
        title="Search Term Tags"
        description="Tag and organize search terms for faster PPC triage."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={exportCsv} disabled={loading || rows.length === 0}>
              <Upload className="size-4" />
              Export
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              {importing ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Import
            </Button>
            <Button onClick={openCreate} className="flex-1 sm:flex-none">
              <Plus className="size-4" />
              Add tag
            </Button>
          </div>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importCsv(file);
        }}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by a tag"
            className="h-11 pl-10"
            aria-label="Search by a tag"
          />
        </div>
        {notice ? (
          <p
            className={`text-sm font-medium ${notice.kind === 'success' ? 'text-primary' : 'text-destructive'}`}
            role="status"
          >
            {notice.text}
          </p>
        ) : null}
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="h-11 px-4 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Search Term
                  </th>
                  <th className="h-11 px-4 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Type
                  </th>
                  <th className="h-11 px-4 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Tag
                  </th>
                  <th className="h-11 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading && [0, 1, 2].map((i) => <SkeletonRow key={i} />)}

                {!loading && !loadError && rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-0">
                      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                        <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Tag className="size-5" />
                        </span>
                        <p className="text-sm font-bold">No search term tags found.</p>
                        <p className="max-w-sm text-sm font-medium text-muted-foreground">
                          Add tags to your search terms to group brand, competitor, and convert terms for faster PPC
                          triage — or import them from a CSV.
                        </p>
                        <Button onClick={openCreate} className="mt-1">
                          <Plus className="size-4" />
                          Add tag
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && !loadError && rows.length > 0 && filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-0">
                      <div className="px-6 py-12 text-center text-sm font-medium text-muted-foreground">
                        No tags match &ldquo;{search.trim()}&rdquo;.
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && loadError && (
                  <tr>
                    <td colSpan={4} className="p-0">
                      <div className="px-6 py-12 text-center text-sm font-medium text-muted-foreground">{loadError}</div>
                    </td>
                  </tr>
                )}

                {!loading &&
                  !loadError &&
                  filtered.map((row) => (
                    <tr key={row.id} className="transition hover:bg-muted/40">
                      <td className="p-4 align-top font-bold tracking-tight">{row.searchTerm}</td>
                      <td className="p-4 align-top">
                        <Badge variant="outline">{row.type}</Badge>
                      </td>
                      <td className="p-4 align-top">
                        <Badge>{row.tag}</Badge>
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(row)}
                            aria-label={`Edit tag for ${row.searchTerm}`}
                            className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            onClick={() => {
                              setFormError(null);
                              setDeleteTarget(row);
                            }}
                            aria-label={`Delete tag for ${row.searchTerm}`}
                            className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {modal && (
        <div
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-6 backdrop-blur-[2px] sm:p-14"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="my-6 w-full max-w-[520px] overflow-hidden rounded-[18px] border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between px-7 pb-4 pt-6">
              <h2 className="text-xl font-extrabold tracking-tight">
                {modal.mode === 'edit' ? 'Edit Tag' : 'Add Tag'}
              </h2>
              <button
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border transition hover:bg-muted disabled:opacity-50"
              >
                <X className="size-4 text-foreground/70" />
              </button>
            </div>

            <div className="space-y-4 px-7 pb-2">
              <div>
                <label
                  htmlFor="tag-search-term"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground"
                >
                  Search Term
                </label>
                <Input
                  id="tag-search-term"
                  value={form.searchTerm}
                  maxLength={TERM_MAX}
                  autoFocus
                  onChange={(e) => set('searchTerm', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !saving) void submit();
                  }}
                  placeholder="e.g. wireless earbuds"
                  className="h-11"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="tag-type"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground"
                  >
                    Type
                  </label>
                  <select
                    id="tag-type"
                    value={form.type}
                    onChange={(e) => set('type', e.target.value as TagType)}
                    className={selectClass}
                  >
                    {TAG_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="tag-label"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground"
                  >
                    Tag
                  </label>
                  <Input
                    id="tag-label"
                    value={form.tag}
                    maxLength={TAG_MAX}
                    list="existing-tag-labels"
                    onChange={(e) => set('tag', e.target.value)}
                    placeholder="e.g. Brand"
                    className="h-11"
                  />
                  <datalist id="existing-tag-labels">
                    {existingTags.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
              </div>

              {formError ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                  {formError}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-3 px-7 pb-6 pt-5">
              <Button variant="outline" onClick={closeModal} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => void submit()} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                {modal.mode === 'edit' ? 'Save Changes' : 'Add Tag'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          onClick={() => {
            if (!deleting) {
              setDeleteTarget(null);
              setFormError(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-6 backdrop-blur-[2px] sm:p-14"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-16 w-full max-w-[440px] overflow-hidden rounded-[18px] border border-border bg-card shadow-2xl"
          >
            <div className="px-7 pb-2 pt-6">
              <h2 className="text-xl font-extrabold tracking-tight">Delete this tag?</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">
                <span className="font-bold text-foreground">{deleteTarget.tag}</span> will be removed from{' '}
                <span className="font-bold text-foreground">{deleteTarget.searchTerm}</span>. This cannot be undone.
              </p>
              {formError ? (
                <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                  {formError}
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-3 px-7 pb-6 pt-5">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteTarget(null);
                  setFormError(null);
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => void confirmDelete()} disabled={deleting}>
                {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
                Delete Tag
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
