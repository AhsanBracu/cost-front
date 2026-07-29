import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CostsApi } from "../api/costs";
import { getErrorMessage, receiptUrl } from "../lib/api";
import { CostCategory, PaymentMethod } from "../types";

const CURRENCIES = ["SEK", "BDT", "USD", "CAD", "AUD"];

interface FormState {
  amount: string;
  currency: string;
  date: string;
  place: string;
  description: string;
  category: CostCategory;
  paymentMethod: PaymentMethod;
  tags: string;
  notes: string;
}

const emptyForm: FormState = {
  amount: "",
  currency: "USD",
  date: new Date().toISOString().slice(0, 10),
  place: "",
  description: "",
  category: CostCategory.Other,
  paymentMethod: PaymentMethod.Cash,
  tags: "",
  notes: "",
};

export function CostFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(emptyForm);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: existing } = useQuery({
    queryKey: ["cost", id],
    queryFn: () => CostsApi.get(id as string),
    enabled: isEditing,
  });

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
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">
        {isEditing ? "Edit cost" : "Add cost"}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-slate-700">
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
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#2a78d6] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-slate-700">
              Currency
            </label>
            <select
              id="currency"
              required
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#2a78d6] focus:outline-none"
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
            <label htmlFor="date" className="block text-sm font-medium text-slate-700">
              Date
            </label>
            <input
              id="date"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#2a78d6] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="place" className="block text-sm font-medium text-slate-700">
              Place
            </label>
            <input
              id="place"
              value={form.place}
              onChange={(e) => setForm((f) => ({ ...f, place: e.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#2a78d6] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-slate-700">
              Category
            </label>
            <select
              id="category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as CostCategory }))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#2a78d6] focus:outline-none"
            >
              {Object.values(CostCategory).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-slate-700">
              Payment method
            </label>
            <select
              id="paymentMethod"
              value={form.paymentMethod}
              onChange={(e) =>
                setForm((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#2a78d6] focus:outline-none"
            >
              {Object.values(PaymentMethod).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700">
            Description
          </label>
          <input
            id="description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#2a78d6] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-slate-700">
            Tags (comma separated)
          </label>
          <input
            id="tags"
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#2a78d6] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
            Notes
          </label>
          <textarea
            id="notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#2a78d6] focus:outline-none"
            rows={3}
          />
        </div>

        <div>
          <label htmlFor="receipt" className="block text-sm font-medium text-slate-700">
            Receipt (image or PDF)
          </label>
          {existing?.receiptUrl && !receipt && (
            <a
              href={receiptUrl(existing.receiptUrl)}
              target="_blank"
              rel="noreferrer"
              className="mb-1 block text-sm text-[#2a78d6] underline"
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="rounded-md bg-[#2a78d6] px-4 py-2 text-sm font-medium text-white hover:bg-[#184f95] disabled:opacity-50"
          >
            {saveMutation.isPending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/costs")}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
