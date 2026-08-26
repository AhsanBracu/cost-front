import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BudgetsApi } from "../api/budgets";
import { getErrorMessage } from "../lib/api";
import { useCategories, useCategoryColor } from "../lib/categoryMeta";
import { CURRENCIES, DEFAULT_CURRENCY, currencyFormatter } from "../lib/format";


const currentMonthValue = () => new Date().toISOString().slice(0, 7);

function parseMonthValue(value: string): { year: number; month: number } {
  const [year, month] = value.split("-").map(Number);
  return { year, month };
}

function ProgressBar({ percent, over }: { percent: number; over: boolean }) {
  return (
    <div className="h-2 w-full rounded-full bg-raised">
      <div
        className="h-2 rounded-full transition-all"
        style={{
          width: `${Math.min(percent, 100)}%`,
          backgroundColor: over ? "#ff5c5c" : percent > 80 ? "#ffb020" : "#00d68f",
        }}
      />
    </div>
  );
}

export function BudgetPage() {
  const [monthValue, setMonthValue] = useState(currentMonthValue());
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const { year, month } = parseMonthValue(monthValue);
  const queryClient = useQueryClient();

  const { data: categories } = useCategories();
  const categoryColor = useCategoryColor();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["budgets", year, month] });
    queryClient.invalidateQueries({ queryKey: ["budget-summary", year, month] });
  };

  const { data: budgets } = useQuery({
    queryKey: ["budgets", year, month],
    queryFn: () => BudgetsApi.get(year, month),
  });

  const { data: summary, isLoading, error } = useQuery({
    queryKey: ["budget-summary", year, month],
    queryFn: () => BudgetsApi.getSummary(year, month),
  });

  // --- Overall monthly limit ---
  const [limitInput, setLimitInput] = useState("");
  const [limitError, setLimitError] = useState<string | null>(null);

  useEffect(() => {
    setLimitInput(budgets?.monthlyLimit ? String(budgets.monthlyLimit.amount) : "");
    if (budgets?.monthlyLimit) setCurrency(budgets.monthlyLimit.currency);
    setLimitError(null);
  }, [budgets?.monthlyLimit, monthValue]);

  const saveLimitMutation = useMutation({
    mutationFn: () =>
      BudgetsApi.setMonthlyLimit({ year, month, amount: Number(limitInput), currency }),
    onSuccess: invalidate,
    onError: (err) => setLimitError(getErrorMessage(err)),
  });

  const removeLimitMutation = useMutation({
    mutationFn: () => BudgetsApi.removeMonthlyLimit(year, month),
    onSuccess: invalidate,
    onError: (err) => setLimitError(getErrorMessage(err)),
  });

  const handleLimitSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLimitError(null);
    saveLimitMutation.mutate();
  };

  // --- Per-category budgets ---
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [rowError, setRowError] = useState<string | null>(null);

  const saveBudgetMutation = useMutation({
    mutationFn: ({ category, amount }: { category: string; amount: number }) =>
      BudgetsApi.setCategoryBudget({ year, month, category, amount, currency }),
    onSuccess: invalidate,
    onError: (err) => setRowError(getErrorMessage(err)),
  });

  // Rows are driven by the user's category list so every category is
  // budgetable, plus any category that only appears in the summary --
  // i.e. one that was spent on but has since been deleted.
  const rows = useMemo(() => {
    const summaryForCurrency = summary?.categories.filter((c) => c.currency === currency) ?? [];
    const names = [
      ...(categories?.map((c) => c.name) ?? []),
      ...summaryForCurrency.map((c) => c.category),
    ];

    return [...new Set(names)].sort().map((name) => {
      const row = summaryForCurrency.find((c) => c.category === name);
      const isKnown = categories?.some((c) => c.name === name) ?? false;
      return {
        category: name,
        isKnown,
        budgeted: row?.budgeted ?? 0,
        spent: row?.spent ?? 0,
        remaining: row?.remaining ?? 0,
        percentUsed: row?.percentUsed ?? null,
      };
    });
  }, [categories, summary, currency]);

  const otherCurrencies = useMemo(() => {
    const others = summary?.categories.filter((c) => c.currency !== currency) ?? [];
    return [...new Set(others.map((c) => c.currency))];
  }, [summary, currency]);

  const commitDraft = (category: string, currentBudgeted: number) => {
    const draft = drafts[category];
    if (draft === undefined) return;

    const amount = Number(draft);
    if (draft === "" || Number.isNaN(amount) || amount < 0) {
      setDrafts((d) => {
        const next = { ...d };
        delete next[category];
        return next;
      });
      return;
    }

    if (amount !== currentBudgeted) {
      setRowError(null);
      saveBudgetMutation.mutate({ category, amount });
    }

    setDrafts((d) => {
      const next = { ...d };
      delete next[category];
      return next;
    });
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ink">Budget</h1>
        <div className="flex gap-2">
          <select
            aria-label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="input"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            aria-label="Month"
            type="month"
            value={monthValue}
            onChange={(e) => setMonthValue(e.target.value)}
            className="input"
          />
        </div>
      </div>

      {summary?.warnings.map((warning) => (
        <div
          key={warning}
          className="mb-4 rounded-lg border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn"
        >
          {warning}
        </div>
      ))}

      {/* Overall monthly limit */}
      <div className="mb-6 card-lg">
        <h2 className="mb-4 text-sm font-semibold text-ink-muted">Overall limit for {monthValue}</h2>
        <form onSubmit={handleLimitSubmit} className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="limit" className="block text-sm font-medium text-ink-muted">
              Monthly limit ({currency})
            </label>
            <input
              id="limit"
              type="number"
              step="0.01"
              min="0"
              required
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              className="mt-1 w-40 input"
            />
          </div>
          <button
            type="submit"
            disabled={saveLimitMutation.isPending}
            className="btn btn-primary"
          >
            {saveLimitMutation.isPending ? "Saving…" : budgets?.monthlyLimit ? "Update" : "Set limit"}
          </button>
          {budgets?.monthlyLimit && (
            <button
              type="button"
              onClick={() => removeLimitMutation.mutate()}
              className="btn btn-ghost"
            >
              Remove
            </button>
          )}
        </form>
        {limitError && <p className="mt-3 text-sm text-down">{limitError}</p>}

        {summary?.overall && (
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5 sm:grid-cols-4">
            <div>
              <p className="text-sm text-ink-muted">Spent</p>
              <p className="numeric mt-1 text-xl font-semibold text-ink">
                {currencyFormatter(summary.overall.spent, summary.overall.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-ink-muted">Remaining</p>
              <p
                className={`mt-1 text-xl font-semibold ${
                  summary.overall.remaining < 0 ? "text-down" : "text-up"
                }`}
              >
                {currencyFormatter(summary.overall.remaining, summary.overall.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-ink-muted">Days left</p>
              <p className="numeric mt-1 text-xl font-semibold text-ink">
                {summary.overall.daysRemaining}
              </p>
            </div>
            <div>
              <p className="text-sm text-ink-muted">Spend per day</p>
              <p className="numeric mt-1 text-xl font-semibold text-ink">
                {summary.overall.dailyPace === null
                  ? "—"
                  : currencyFormatter(summary.overall.dailyPace, summary.overall.currency)}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-4">
              <ProgressBar
                percent={summary.overall.percentUsed ?? 0}
                over={summary.overall.remaining < 0}
              />
            </div>
          </div>
        )}
      </div>

      {/* Per-category budgets */}
      <div className="card-lg">
        <h2 className="mb-1 text-sm font-semibold text-ink-muted">Category budgets</h2>
        <p className="mb-4 text-xs text-ink-dim">
          Edit an amount and click away to save. A new month starts from the previous month's budgets.
        </p>

        {error && <p className="mb-3 text-sm text-down">{getErrorMessage(error)}</p>}
        {rowError && <p className="mb-3 text-sm text-down">{rowError}</p>}
        {isLoading && <p className="text-sm text-ink-muted">Loading…</p>}

        <div className="overflow-x-auto">
          <table className="numeric w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-muted">
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Budget</th>
                <th className="py-2 pr-4">Spent</th>
                <th className="py-2 pr-4">Remaining</th>
                <th className="py-2 w-40">Used</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.category} className="border-b border-line">
                  <td className="py-2 pr-4">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: categoryColor(row.category) }}
                      />
                      <span className="font-medium text-ink">{row.category}</span>
                      {!row.isKnown && (
                        <span
                          className="rounded-full bg-raised px-2 py-0.5 text-xs text-ink-muted"
                          title="This category no longer exists, but past costs still use it"
                        >
                          removed
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      aria-label={`${row.category} budget`}
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={!row.isKnown}
                      value={drafts[row.category] ?? (row.budgeted || "")}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [row.category]: e.target.value }))
                      }
                      onBlur={() => commitDraft(row.category, row.budgeted)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      placeholder="0"
                      className="w-28 rounded-md border border-line-strong px-2 py-1 text-sm focus:border-accent focus:outline-none disabled:bg-raised disabled:text-ink-dim"
                    />
                  </td>
                  <td className="py-2 pr-4">{currencyFormatter(row.spent, currency)}</td>
                  <td
                    className={`py-2 pr-4 font-medium ${
                      row.budgeted > 0 && row.remaining < 0 ? "text-down" : "text-ink-muted"
                    }`}
                  >
                    {row.budgeted > 0 ? currencyFormatter(row.remaining, currency) : "—"}
                  </td>
                  <td className="py-2">
                    {row.percentUsed === null ? (
                      <span className="text-xs text-ink-dim">
                        {row.spent > 0 ? "no budget set" : "—"}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ProgressBar percent={row.percentUsed} over={row.remaining < 0} />
                        <span className="w-12 shrink-0 text-right text-xs text-ink-muted">
                          {Math.round(row.percentUsed)}%
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {otherCurrencies.length > 0 && (
          <p className="mt-4 text-xs text-ink-dim">
            You also have spending in {otherCurrencies.join(", ")} this month. Switch currency above
            to budget for it.
          </p>
        )}
      </div>
    </div>
  );
}
