import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CostsApi } from "../api/costs";
import { getErrorMessage, receiptUrl } from "../lib/api";
import { CategoryBadge, useCategories, useCategoryColor } from "../lib/categoryMeta";
import { currencyFormatter } from "../lib/format";
import { SHARED, useFamilyMembers } from "../lib/familyMeta";
import { PaymentMethod } from "../types";
import type { CostListQuery } from "../types";

const DEFAULT_FILTERS: CostListQuery = {
  page: 1,
  limit: 20,
  sortBy: "date",
  sortOrder: "desc",
};

// Stats are computed from up to 100 matching entries (the API's max page
// size) rather than the full filtered set, since there's no aggregate
// endpoint. Truncation is called out in the UI when it applies.
const STATS_SAMPLE_SIZE = 100;

function StatTile({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="card">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="numeric mt-1 truncate text-2xl font-semibold text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-dim">{sub}</p>}
    </div>
  );
}

export function CostsListPage() {
  const [filters, setFilters] = useState<CostListQuery>(DEFAULT_FILTERS);
  const [formState, setFormState] = useState({
    search: "",
    category: "",
    paymentMethod: "",
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: "",
    forWhom: "",
  });
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const categoryColor = useCategoryColor();
  const { members, hasOthers, nameOf } = useFamilyMembers();

  const { data, isLoading, error } = useQuery({
    queryKey: ["costs", filters],
    queryFn: () => CostsApi.list(filters),
  });

  const statsFilters: CostListQuery = { ...filters, page: 1, limit: STATS_SAMPLE_SIZE };
  const { data: statsData } = useQuery({
    queryKey: ["costs-stats", statsFilters],
    queryFn: () => CostsApi.list(statsFilters),
  });

  const stats = useMemo(() => {
    if (!statsData) return null;
    const items = statsData.items;
    if (items.length === 0) return { count: 0, totalsByCurrency: [], topCategory: null, truncated: false };

    const totalsByCurrency = new Map<string, number>();
    const countByCategory = new Map<string, number>();
    for (const item of items) {
      totalsByCurrency.set(item.currency, (totalsByCurrency.get(item.currency) ?? 0) + item.amount);
      countByCategory.set(item.category, (countByCategory.get(item.category) ?? 0) + 1);
    }
    const topCategory = [...countByCategory.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

    return {
      count: statsData.total,
      totalsByCurrency: [...totalsByCurrency.entries()],
      topCategory: topCategory ?? null,
      truncated: statsData.total > items.length,
    };
  }, [statsData]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => CostsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["costs"] }),
  });

  const applyFilters = (e: FormEvent) => {
    e.preventDefault();
    setFilters({
      ...DEFAULT_FILTERS,
      search: formState.search || undefined,
      category: formState.category || undefined,
      paymentMethod: (formState.paymentMethod || undefined) as PaymentMethod | undefined,
      startDate: formState.startDate || undefined,
      endDate: formState.endDate || undefined,
      minAmount: formState.minAmount ? Number(formState.minAmount) : undefined,
      maxAmount: formState.maxAmount ? Number(formState.maxAmount) : undefined,
      forWhom: formState.forWhom || undefined,
    });
  };

  const resetFilters = () => {
    setFormState({
      search: "",
      category: "",
      paymentMethod: "",
      startDate: "",
      endDate: "",
      minAmount: "",
      maxAmount: "",
      forWhom: "",
    });
    setFilters(DEFAULT_FILTERS);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this cost entry?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Costs</h1>
        <Link
          to="/costs/new"
          className="btn btn-primary"
        >
          + Add cost
        </Link>
      </div>

      {stats && stats.count > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile
            label="Entries"
            value={stats.count.toLocaleString()}
            sub={stats.truncated ? `stats from most recent ${STATS_SAMPLE_SIZE}` : undefined}
          />
          <StatTile
            label="Total spend"
            value={
              stats.totalsByCurrency.length
                ? stats.totalsByCurrency
                    .map(([currency, sum]) => currencyFormatter(sum, currency))
                    .join(" + ")
                : "—"
            }
            sub={stats.truncated ? `stats from most recent ${STATS_SAMPLE_SIZE}` : undefined}
          />
          <StatTile
            label="Top category"
            value={
              stats.topCategory ? (
                <span className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: categoryColor(stats.topCategory) }}
                  />
                  {stats.topCategory}
                </span>
              ) : (
                "—"
              )
            }
          />
        </div>
      )}

      <form
        onSubmit={applyFilters}
        className="mb-6 grid grid-cols-2 gap-3 card sm:grid-cols-4"
      >
        <input
          aria-label="Search"
          placeholder="Search"
          value={formState.search}
          onChange={(e) => setFormState((s) => ({ ...s, search: e.target.value }))}
          className="input"
        />
        <select
          aria-label="Category"
          value={formState.category}
          onChange={(e) => setFormState((s) => ({ ...s, category: e.target.value }))}
          className="input"
        >
          <option value="">All categories</option>
          {categories?.map((c) => (
            <option key={c._id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Payment method"
          value={formState.paymentMethod}
          onChange={(e) => setFormState((s) => ({ ...s, paymentMethod: e.target.value }))}
          className="input"
        >
          <option value="">All payment methods</option>
          {Object.values(PaymentMethod).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            aria-label="Minimum amount"
            type="number"
            placeholder="Min"
            value={formState.minAmount}
            onChange={(e) => setFormState((s) => ({ ...s, minAmount: e.target.value }))}
            className="input"
          />
          <input
            aria-label="Maximum amount"
            type="number"
            placeholder="Max"
            value={formState.maxAmount}
            onChange={(e) => setFormState((s) => ({ ...s, maxAmount: e.target.value }))}
            className="input"
          />
        </div>
        <input
          aria-label="Start date"
          type="date"
          value={formState.startDate}
          onChange={(e) => setFormState((s) => ({ ...s, startDate: e.target.value }))}
          className="input"
        />
        <input
          aria-label="End date"
          type="date"
          value={formState.endDate}
          onChange={(e) => setFormState((s) => ({ ...s, endDate: e.target.value }))}
          className="input"
        />
        {hasOthers && (
          <select
            aria-label="For whom"
            value={formState.forWhom}
            onChange={(e) => setFormState((s) => ({ ...s, forWhom: e.target.value }))}
            className="input"
          >
            <option value="">Everyone</option>
            <option value={SHARED}>Shared only</option>
            {members.map((m) => (
              <option key={m._id} value={m._id}>
                For {m.name}
              </option>
            ))}
          </select>
        )}
        {/* Kept in one grid cell so they don't split across rows when the
            person filter is present. */}
        <div className="flex gap-2">
          <button type="submit" className="w-full btn btn-primary">
            Apply
          </button>
          <button type="button" onClick={resetFilters} className="w-full btn btn-ghost">
            Reset
          </button>
        </div>
      </form>

      {error && <p className="mb-4 text-sm text-down">{getErrorMessage(error)}</p>}
      {isLoading && <p className="text-sm text-ink-muted">Loading…</p>}

      {data && (
        <>
          <div className="space-y-2">
            {data.items.length === 0 && (
              <div className="rounded-xl border border-dashed border-line-strong bg-surface py-10 text-center text-ink-dim">
                No costs found.
              </div>
            )}
            {data.items.map((cost) => (
              <div
                key={cost._id}
                className="flex items-center justify-between gap-4 card transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ backgroundColor: categoryColor(cost.category) }}
                  >
                    {cost.category.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">
                      {cost.place || cost.description || "Untitled"}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                      <span>{new Date(cost.date).toLocaleDateString()}</span>
                      <span>·</span>
                      <CategoryBadge category={cost.category} color={categoryColor(cost.category)} />
                      <span>·</span>
                      <span className="rounded-full bg-raised px-2 py-0.5 text-ink-muted">
                        {cost.paymentMethod}
                      </span>
                      {hasOthers && (
                        <>
                          <span>·</span>
                          <span className="text-ink-dim">
                            {nameOf(cost.paidBy)} → {cost.forWhom ? nameOf(cost.forWhom) : "Shared"}
                          </span>
                        </>
                      )}
                      {cost.receiptUrl && (
                        <a
                          href={receiptUrl(cost.receiptUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent hover:underline"
                        >
                          Receipt
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="numeric text-lg font-semibold text-ink">
                    {currencyFormatter(cost.amount, cost.currency)}
                  </span>
                  <div className="flex flex-col gap-1 text-sm">
                    <Link to={`/costs/${cost._id}`} className="text-ink-muted hover:text-accent">
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(cost._id)}
                      className="text-down hover:text-down"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-ink-muted">
            <span>
              Page {data.page} of {data.totalPages || 1} · {data.total} total
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={data.page <= 1}
                onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) - 1 }))}
                className="rounded-md border border-line-strong bg-surface px-3 py-1.5 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={data.page >= data.totalPages}
                onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))}
                className="rounded-md border border-line-strong bg-surface px-3 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
