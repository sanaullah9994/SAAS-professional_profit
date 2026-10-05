'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, ChevronDown, ChevronUp, Loader2, Pencil, Plus, Receipt, Trash2, X } from 'lucide-react';
import { Badge, Button, Card, CardContent, Input } from '@amazon-profit/ui';
import { PageHeader } from '@/components/dashboard';
import {
  createManualExpense,
  deleteManualExpense,
  fetchManualExpenses,
  updateManualExpense,
  type ManualExpenseInput,
  type ManualExpenseRow,
} from '@/lib/api';

const EXPENSE_TYPES = [
  'Software & Subscriptions',
  'Shipping & Fulfilment',
  'Payroll & Contractors',
  'Marketing & Advertising',
  'Office & Supplies',
  'Taxes & Licenses',
  'Other',
] as const;

const DESCRIPTION_MAX = 160;
const NOTES_MAX = 500;

type SortKey = 'description' | 'type' | 'amount' | 'status' | 'date';
type ModalState = { mode: 'create' } | { mode: 'edit'; row: ManualExpenseRow };

type FormState = {
  description: string;
  type: string;
  amount: string;
  status: 'paid' | 'pending';
  expenseDate: string;
  endDate: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  description: '',
  type: EXPENSE_TYPES[0],
  amount: '',
  status: 'paid',
  expenseDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  notes: '',
});

const formFromRow = (row: ManualExpenseRow): FormState => ({
  description: row.description,
  type: row.type,
  amount: String(row.amount),
  status: row.status,
  expenseDate: row.expenseDate,
  endDate: row.endDate ?? '',
  notes: row.notes ?? '',
});

const fmtMoney = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const dateLabel = (row: ManualExpenseRow) =>
  row.endDate ? `${fmtDate(row.expenseDate)} – ${fmtDate(row.endDate)}` : fmtDate(row.expenseDate);

const sortValue = (row: ManualExpenseRow, key: SortKey): string | number => {
  switch (key) {
    case 'amount':
      return row.amount;
    case 'date':
      return row.expenseDate;
    case 'status':
      return row.status;
    case 'type':
      return row.type.toLowerCase();
    default:
      return row.description.toLowerCase();
  }
};

const selectClass =
  'flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ring';

function SkeletonRow() {
  return (
    <tr className="border-b border-border">
      <td className="p-4"><div className="pp-skeleton h-4 w-44" /></td>
      <td className="p-4"><div className="pp-skeleton h-4 w-32" /></td>
      <td className="p-4"><div className="pp-skeleton h-4 w-20" /></td>
      <td className="p-4"><div className="pp-skeleton h-5 w-16 rounded-full" /></td>
      <td className="p-4"><div className="pp-skeleton h-4 w-28" /></td>
      <td className="p-4"><div className="pp-skeleton ml-auto h-8 w-20" /></td>
    </tr>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
      {children}
    </label>
  );
}

export function ManualExpensesPage() {
  const [rows, setRows] = useState<ManualExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'date', dir: 'desc' });
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ManualExpenseRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchManualExpenses();
    if (data === null) {
      setLoadError('We could not load your manual expenses. Please refresh the page.');
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

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
    setModal({ mode: 'create' });
  };

  const openEdit = (row: ManualExpenseRow) => {
    setForm(formFromRow(row));
    setFormError(null);
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
    const description = form.description.trim();
    const amount = Number(form.amount);
    if (!description) return setFormError('Enter a description.');
    if (description.length > DESCRIPTION_MAX) return setFormError(`Description must be ${DESCRIPTION_MAX} characters or fewer.`);
    if (!form.amount.trim() || !Number.isFinite(amount) || amount <= 0) return setFormError('Enter an amount greater than zero.');
    if (!form.expenseDate) return setFormError('Choose a date.');
    if (form.endDate && form.endDate < form.expenseDate) return setFormError('Period end date must be on or after the start date.');
    if (form.notes.trim().length > NOTES_MAX) return setFormError(`Notes must be ${NOTES_MAX} characters or fewer.`);

    const input: ManualExpenseInput = {
      description,
      type: form.type,
      amount,
      status: form.status,
      expenseDate: form.expenseDate,
      endDate: form.endDate || null,
      notes: form.notes.trim() || null,
    };

    setSaving(true);
    setFormError(null);
    const result =
      modal?.mode === 'edit' ? await updateManualExpense(modal.row.id, input) : await createManualExpense(input);

    if (!result.ok || !result.row) {
      setFormError(result.error ?? 'Something went wrong. Please try again.');
      setSaving(false);
      return;
    }

    const saved = result.row;
    setRows((prev) => (modal?.mode === 'edit' ? prev.map((r) => (r.id === saved.id ? saved : r)) : [...prev, saved]));
    setSaving(false);
    setModal(null);
    setFormError(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteManualExpense(deleteTarget.id);
    if (!result.ok) {
      setFormError(result.error ?? 'Could not delete this expense. Please try again.');
      setDeleting(false);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
    setFormError(null);
  };

  const columns: { key: SortKey; label: string; className?: string }[] = [
    { key: 'description', label: 'Description' },
    { key: 'type', label: 'Type' },
    { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status' },
    { key: 'date', label: 'Date/Period' },
  ];

  const sortIcon = (key: SortKey) => {
    if (sort.key !== key) return <ArrowUpDown className="size-3.5 text-muted-foreground/50" />;
    return sort.dir === 'asc' ? (
      <ChevronUp className="size-3.5 text-primary" />
    ) : (
      <ChevronDown className="size-3.5 text-primary" />
    );
  };

  return (
    <>
      <PageHeader
        title="Manual Expenses"
        description="Track one-off and recurring costs that don't come from Amazon."
        action={
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="size-4" />
            Create Manual Expense
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={sort.key === col.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className={`h-11 px-4 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground${
                        col.key === 'amount' ? ' text-right' : ''
                      }`}
                    >
                      <button
                        onClick={() => toggleSort(col.key)}
                        className={`inline-flex items-center gap-1.5 transition hover:text-foreground${
                          col.key === 'amount' ? 'ml-auto' : ''
                        }`}
                      >
                        {col.label}
                        {sortIcon(col.key)}
                      </button>
                    </th>
                  ))}
                  <th className="h-11 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading && [0, 1, 2].map((i) => <SkeletonRow key={i} />)}

                {!loading && !loadError && sorted.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                        <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Receipt className="size-5" />
                        </span>
                        <p className="text-sm font-bold">No manual expenses found</p>
                        <p className="max-w-sm text-sm font-medium text-muted-foreground">
                          Add costs that don&apos;t come from Amazon — software, shipping, payroll — so they are
                          accounted for alongside your Amazon fees.
                        </p>
                        <Button onClick={openCreate} className="mt-1">
                          <Plus className="size-4" />
                          Create Manual Expense
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && loadError && (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <div className="px-6 py-12 text-center text-sm font-medium text-muted-foreground">{loadError}</div>
                    </td>
                  </tr>
                )}

                {!loading &&
                  !loadError &&
                  sorted.map((row) => (
                    <tr key={row.id} className="transition hover:bg-muted/40">
                      <td className="p-4 align-top">
                        <div className="font-bold tracking-tight">{row.description}</div>
                        {row.notes ? (
                          <div className="mt-0.5 max-w-[320px] truncate text-xs font-medium text-muted-foreground">
                            {row.notes}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-4 align-top text-sm font-medium text-muted-foreground">{row.type}</td>
                      <td className="p-4 align-top text-right font-bold tabular-nums">{fmtMoney(row.amount)}</td>
                      <td className="p-4 align-top">
                        <Badge variant={row.status === 'paid' ? 'success' : 'warning'}>
                          {row.status === 'paid' ? 'Paid' : 'Pending'}
                        </Badge>
                      </td>
                      <td className="p-4 align-top text-sm font-medium text-muted-foreground">{dateLabel(row)}</td>
                      <td className="p-4 align-top">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(row)}
                            aria-label={`Edit ${row.description}`}
                            className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            onClick={() => {
                              setFormError(null);
                              setDeleteTarget(row);
                            }}
                            aria-label={`Delete ${row.description}`}
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
            className="my-6 w-full max-w-[560px] overflow-hidden rounded-[18px] border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between px-7 pb-4 pt-6">
              <h2 className="text-xl font-extrabold tracking-tight">
                {modal.mode === 'edit' ? 'Edit Manual Expense' : 'Create Manual Expense'}
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
                <FieldLabel htmlFor="expense-description">Description</FieldLabel>
                <Input
                  id="expense-description"
                  value={form.description}
                  maxLength={DESCRIPTION_MAX}
                  autoFocus
                  onChange={(e) => set('description', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !saving) void submit();
                  }}
                  placeholder="e.g. Accounting software subscription"
                  className="h-11"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="expense-type">Type</FieldLabel>
                  <select
                    id="expense-type"
                    value={form.type}
                    onChange={(e) => set('type', e.target.value)}
                    className={selectClass}
                  >
                    {EXPENSE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel htmlFor="expense-amount">Amount (USD)</FieldLabel>
                  <Input
                    id="expense-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => set('amount', e.target.value)}
                    placeholder="0.00"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="expense-date">Date</FieldLabel>
                  <Input
                    id="expense-date"
                    type="date"
                    value={form.expenseDate}
                    onChange={(e) => set('expenseDate', e.target.value)}
                    className="h-11"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="expense-end-date">Period end (optional)</FieldLabel>
                  <Input
                    id="expense-end-date"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => set('endDate', e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="expense-status">Status</FieldLabel>
                <select
                  id="expense-status"
                  value={form.status}
                  onChange={(e) => set('status', e.target.value as 'paid' | 'pending')}
                  className={selectClass}
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div>
                <FieldLabel htmlFor="expense-notes">Notes (optional)</FieldLabel>
                <Input
                  id="expense-notes"
                  value={form.notes}
                  maxLength={NOTES_MAX}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Anything worth remembering about this cost"
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
                {modal.mode === 'edit' ? 'Save Changes' : 'Create Expense'}
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
              <h2 className="text-xl font-extrabold tracking-tight">Delete this expense?</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">
                <span className="font-bold text-foreground">{deleteTarget.description}</span> will be removed from
                your workspace. This cannot be undone.
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
                Delete Expense
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
