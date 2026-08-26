import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CostsApi } from "../api/costs";
import { getErrorMessage, receiptUrl } from "../lib/api";
import { useCategories } from "../lib/categoryMeta";
import { SHARED, useFamilyMembers } from "../lib/familyMeta";
import { PersonSelect } from "../components/PersonSelect";
import { CURRENCIES, DEFAULT_CURRENCY } from "../lib/format";
import { PaymentMethod } from "../types";


interface FormState {
  amount: string;
  currency: string;
  date: string;
  place: string;
  description: string;
  category: string;
  paymentMethod: PaymentMethod;
  tags: string;
  notes: string;
  paidBy: string;
  /** A member id, or SHARED for a household cost. */
  forWhom: string;
}

const emptyForm: FormState = {
  amount: "",
  currency: DEFAULT_CURRENCY,
  date: new Date().toISOString().slice(0, 10),
  place: "",
  description: "",
  category: "",
  paymentMethod: PaymentMethod.Cash,
  tags: "",
  notes: "",
  paidBy: "",
  forWhom: SHARED,
};

export function CostFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(emptyForm);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: categories } = useCategories();
  const { currentUserId, hasOthers } = useFamilyMembers();

  const { data: existing } = useQuery({
    queryKey: ["cost", id],
    queryFn: () => CostsApi.get(id as string),
    enabled: isEditing,
  });

  // Categories load async, so a new cost's form starts with none selected —
  // fill in the first one once they arrive, without clobbering a category
  // already set (either by the user or loaded from the cost being edited).
  // Whoever is entering the cost is the likeliest payer.
  useEffect(() => {
    if (currentUserId) {
      setForm((f) => (f.paidBy ? f : { ...f, paidBy: currentUserId }));
    }
  }, [currentUserId]);

  useEffect(() => {
    if (categories?.length) {
      setForm((f) => (f.category ? f : { ...f, category: categories[0].name }));
    }
  }, [categories]);

  useEffect(() => {
    if (existing) {
      setForm({
        amount: String(existing.amount),
        currency: existing.currency,
        date: existing.date.slice(0, 10),
        place: existing.place ?? "",
        description: existing.description ?? "",
        category: existing.category,
        paymentMethod: existing.paymentMethod,
        tags: existing.tags.join(", "),
        notes: existing.notes ?? "",
        paidBy: existing.paidBy ?? "",
        forWhom: existing.forWhom ?? SHARED,
      });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        amount: Number(form.amount),
        currency: form.currency,
        date: form.date,
        place: form.place || undefined,
        description: form.description || undefined,
        category: form.category,
        paymentMethod: form.paymentMethod,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        notes: form.notes || undefined,
        paidBy: form.paidBy || undefined,
        forWhom: form.forWhom,
        receipt,
      };
      return isEditing ? CostsApi.update(id as string, payload) : CostsApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costs"] });
      navigate("/costs");
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    saveMutation.mutate();
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-ink">
        {isEditing ? "Edit cost" : "Add cost"}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4 card-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-ink-muted">
              Amount
            </label>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="input mt-1"
            />
          </div>
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-ink-muted">
              Currency
            </label>
            <select
              id="currency"
              required
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              className="input mt-1"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-ink-muted">
              Date
            </label>
            <input
              id="date"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="input mt-1"
            />
          </div>
          <div>
            <label htmlFor="place" className="block text-sm font-medium text-ink-muted">
              Place
            </label>
            <input
              id="place"
              value={form.place}
              onChange={(e) => setForm((f) => ({ ...f, place: e.target.value }))}
              className="input mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-ink-muted">
              Category
            </label>
            <select
              id="category"
              required
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="input mt-1"
            >
              <option value="" disabled>
                Select a category
              </option>
              {/* A cost being edited may use a category that has since been
                  renamed or deleted — keep it selectable so saving doesn't
                  silently reassign it. */}
              {form.category && !categories?.some((c) => c.name === form.category) && (
                <option value={form.category}>{form.category}</option>
              )}
              {categories?.map((c) => (
                <option key={c._id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-ink-muted">
              Payment method
            </label>
            <select
              id="paymentMethod"
              value={form.paymentMethod}
              onChange={(e) =>
                setForm((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))
              }
              className="input mt-1"
            >
              {Object.values(PaymentMethod).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasOthers && (
          <div className="grid grid-cols-2 gap-4">
            <PersonSelect
              id="paidBy"
              label="Paid by"
              value={form.paidBy}
              onChange={(v) => setForm((f) => ({ ...f, paidBy: v }))}
            />
            <PersonSelect
              id="forWhom"
              label="For whom"
              value={form.forWhom}
              onChange={(v) => setForm((f) => ({ ...f, forWhom: v }))}
              sharedOption={{ value: SHARED, label: "Shared (household)" }}
            />
          </div>
        )}

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-ink-muted">
            Description
          </label>
          <input
            id="description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="input mt-1"
          />
        </div>

        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-ink-muted">
            Tags (comma separated)
          </label>
          <input
            id="tags"
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            className="input mt-1"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-ink-muted">
            Notes
          </label>
          <textarea
            id="notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="input mt-1"
            rows={3}
          />
        </div>

        <div>
          <label htmlFor="receipt" className="block text-sm font-medium text-ink-muted">
            Receipt (image or PDF)
          </label>
          {existing?.receiptUrl && !receipt && (
            <a
              href={receiptUrl(existing.receiptUrl)}
              target="_blank"
              rel="noreferrer"
              className="mb-1 block text-sm text-accent underline"
            >
              View current receipt
            </a>
          )}
          <input
            id="receipt"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
            className="mt-1 w-full text-sm"
          />
        </div>

        {error && <p className="text-sm text-down">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="btn btn-primary"
          >
            {saveMutation.isPending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/costs")}
            className="btn btn-ghost"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
