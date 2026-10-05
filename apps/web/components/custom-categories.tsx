'use client';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Shapes, Trash2, X } from 'lucide-react';
import { Button, Card, CardContent, Input } from '@amazon-profit/ui';
import { PageHeader } from '@/components/dashboard';
import {
  createCustomCategory,
  deleteCustomCategory,
  fetchCustomCategories,
  updateCustomCategory,
  type CustomCategoryRow,
} from '@/lib/api';

const NAME_MAX = 60;
const DESCRIPTION_MAX = 200;

type ModalState = { mode: 'create' } | { mode: 'edit'; row: CustomCategoryRow };

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function SkeletonRow() {
  return (
    <tr className="border-b border-border">
      <td className="p-4">
        <div className="pp-skeleton h-4 w-48" />
        <div className="pp-skeleton mt-2 h-3 w-64" />
      </td>
      <td className="p-4">
        <div className="pp-skeleton h-4 w-20" />
      </td>
      <td className="p-4">
        <div className="pp-skeleton ml-auto h-8 w-20" />
      </td>
    </tr>
  );
}

export function CustomCategoriesPage() {
  const [rows, setRows] = useState<CustomCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalState | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<CustomCategoryRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchCustomCategories();
    if (data === null) {
      setLoadError('We could not load your custom categories. Please refresh the page.');
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

  const openCreate = () => {
    setName('');
    setDescription('');
    setFormError(null);
    setModal({ mode: 'create' });
  };

  const openEdit = (row: CustomCategoryRow) => {
    setName(row.name);
    setDescription(row.description ?? '');
    setFormError(null);
    setModal({ mode: 'edit', row });
  };

  const closeModal = () => {
    if (saving) return;
    setModal(null);
    setFormError(null);
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError('Enter a category name.');
      return;
    }
    if (trimmed.length > NAME_MAX) {
      setFormError(`Category name must be ${NAME_MAX} characters or fewer.`);
      return;
    }
    const trimmedDescription = description.trim() || null;
    if (trimmedDescription && trimmedDescription.length > DESCRIPTION_MAX) {
      setFormError(`Description must be ${DESCRIPTION_MAX} characters or fewer.`);
      return;
    }

    setSaving(true);
    setFormError(null);
    const result =
      modal?.mode === 'edit'
        ? await updateCustomCategory(modal.row.id, trimmed, trimmedDescription)
        : await createCustomCategory(trimmed, trimmedDescription);

    if (!result.ok || !result.row) {
      setFormError(result.error ?? 'Something went wrong. Please try again.');
      setSaving(false);
      return;
    }

    setRows((prev) => {
      const next =
        modal?.mode === 'edit' ? prev.map((r) => (r.id === result.row!.id ? result.row! : r)) : [...prev, result.row!];
      return next.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    });
    setSaving(false);
    setModal(null);
    setFormError(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteCustomCategory(deleteTarget.id);
    if (!result.ok) {
      setFormError(result.error ?? 'Could not delete this category. Please try again.');
      setDeleting(false);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
    setFormError(null);
  };

  return (
    <>
      <PageHeader
        title="Custom Categories"
        description="Group products into your own categories for reporting."
        action={
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="size-4" />
            Create Custom Category
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="h-11 px-4 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Category Name
                  </th>
                  <th className="h-11 px-4 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Created
                  </th>
                  <th className="h-11 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading &&
                  [0, 1, 2].map((i) => (
                    <SkeletonRow key={i} />
                  ))}

                {!loading && !loadError && rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-0">
                      <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                        <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Shapes className="size-5" />
                        </span>
                        <p className="text-sm font-bold">No custom categories yet</p>
                        <p className="max-w-sm text-sm font-medium text-muted-foreground">
                          Create your first category to start grouping products for your own reporting.
                        </p>
                        <Button onClick={openCreate} className="mt-1">
                          <Plus className="size-4" />
                          Create Custom Category
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && loadError && (
                  <tr>
                    <td colSpan={3} className="p-0">
                      <div className="px-6 py-12 text-center text-sm font-medium text-muted-foreground">
                        {loadError}
                      </div>
                    </td>
                  </tr>
                )}

                {!loading &&
                  !loadError &&
                  rows.map((row) => (
                    <tr key={row.id} className="transition hover:bg-muted/40">
                      <td className="p-4 align-top">
                        <div className="font-bold tracking-tight">{row.name}</div>
                        {row.description ? (
                          <div className="mt-0.5 text-xs font-medium text-muted-foreground">{row.description}</div>
                        ) : null}
                      </td>
                      <td className="p-4 align-top text-sm font-medium text-muted-foreground">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(row)}
                            aria-label={`Edit ${row.name}`}
                            className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            onClick={() => {
                              setFormError(null);
                              setDeleteTarget(row);
                            }}
                            aria-label={`Delete ${row.name}`}
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
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-6 backdrop-blur-[2px] sm:p-14"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-6 w-full max-w-[520px] overflow-hidden rounded-[18px] border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between px-7 pb-4 pt-6">
              <h2 className="text-xl font-extrabold tracking-tight">
                {modal.mode === 'edit' ? 'Edit Custom Category' : 'Create Custom Category'}
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
                <label htmlFor="custom-category-name" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Category Name
                </label>
                <Input
                  id="custom-category-name"
                  value={name}
                  maxLength={NAME_MAX}
                  autoFocus
                  onChange={(e) => {
                    setName(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !saving) void submit();
                  }}
                  placeholder="e.g. Product Code"
                  className="h-11"
                />
                <p className="mt-1.5 text-xs font-medium text-muted-foreground">
                  {name.length}/{NAME_MAX}
                </p>
              </div>

              <div>
                <label htmlFor="custom-category-description" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Description <span className="normal-case tracking-normal">(optional)</span>
                </label>
                <Input
                  id="custom-category-description"
                  value={description}
                  maxLength={DESCRIPTION_MAX}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="What this category is used for"
                  className="h-11"
                />
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
                {modal.mode === 'edit' ? 'Save Changes' : 'Create Category'}
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
              <h2 className="text-xl font-extrabold tracking-tight">Delete this category?</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">
                <span className="font-bold text-foreground">{deleteTarget.name}</span> will be removed from your
                workspace. This cannot be undone.
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
                Delete Category
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
