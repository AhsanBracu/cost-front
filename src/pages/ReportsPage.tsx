import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ReportsApi } from "../api/reports";
import { SavingsGoalsApi } from "../api/savingsGoals";
import { TrendChart, TrendTable } from "../components/TrendChart";
import { getErrorMessage } from "../lib/api";
import { CATEGORY_COLORS } from "../lib/categoryMeta";
import { CATEGORICAL_PALETTE, currencyFormatter } from "../lib/format";
import type { CategoryTotal, PaymentMethodTotal, ReportInterval, ReportQuery, SavingsTrendQuery } from "../types";

// Inclusive range of `monthsBack` months ending at the current calendar month.
function getSavingsMonthRange(monthsBack: number): SavingsTrendQuery {
  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;
  let startYear = endYear;
  let startMonth = endMonth - (monthsBack - 1);
  while (startMonth <= 0) {
    startMonth += 12;
    startYear -= 1;
  }
  return { startYear, startMonth, endYear, endMonth };
}

const monthLabel = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

// Default range: the current week (last 7 days) through today.
function getDefaultRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  return { startDate: toDateInput(start), endDate: toDateInput(end) };
}

// The immediately preceding range of the same length, for period-over-period comparison.
function getPreviousRange(startDate?: string, endDate?: string): { startDate: string; endDate: string } | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const spanDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (spanDays - 1));
  return { startDate: toDateInput(prevStart), endDate: toDateInput(prevEnd) };
}

// null previous with a non-zero current reads as "new" rather than an infinite percentage.
function computeDeltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function DeltaBadge({ pct, tone = "neutral" }: { pct: number | null | undefined; tone?: "spend" | "neutral" }) {
  if (pct === undefined) return null;
  if (pct === null) return <span className="text-xs font-medium text-slate-400">new</span>;

  const isFlat = Math.abs(pct) < 0.5;
  const isUp = pct > 0;
  const colorClass = isFlat ? "text-slate-400" : tone === "spend" ? (isUp ? "text-red-600" : "text-green-600") : "text-slate-500";
  const arrow = isFlat ? "→" : isUp ? "↑" : "↓";

  return (
    <span className={`text-xs font-medium ${colorClass}`}>
      {arrow} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

function StatTile({
  label,
  value,
  sub,
  delta,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  delta?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      {delta && <p className="mt-1">{delta}</p>}
    </div>
  );
}

function joinCurrencyTotals(totals: Map<string, number>) {
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([currency, total]) => currencyFormatter(total, currency))
    .join(" + ");
}

function BarRow({
  dot,
  label,
  pct,
  amountLabel,
  countLabel,
  deltaPct,
}: {
  dot: string;
  label: string;
  pct: number;
  amountLabel: string;
  countLabel: string;
  deltaPct?: number | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex w-32 shrink-0 items-center gap-1.5 truncate text-sm text-slate-700">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: dot }} />
        {label}
      </span>
      <div className="h-2 flex-1 rounded-full bg-slate-100">
        <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: dot }} />
      </div>
      <span className="flex w-40 shrink-0 items-baseline justify-end gap-2 text-right text-sm font-medium text-slate-900" title={countLabel}>
        {amountLabel}
        <DeltaBadge pct={deltaPct} tone="spend" />
      </span>
    </div>
  );
}

function groupByKey<T extends { total: number; count: number; currency: string }, K extends string>(
  rows: T[],
  keyOf: (row: T) => K
) {
  const grouped = new Map<K, Map<string, { total: number; count: number }>>();
  for (const row of rows) {
    const key = keyOf(row);
    if (!grouped.has(key)) grouped.set(key, new Map());
    grouped.get(key)!.set(row.currency, { total: row.total, count: row.count });
  }
  return grouped;
}

export function ReportsPage() {
  const [filters, setFilters] = useState<ReportQuery>(getDefaultRange());
  const [interval, setInterval] = useState<ReportInterval>("month");
  const [trendView, setTrendView] = useState<"chart" | "table">("chart");
  const [compareEnabled, setCompareEnabled] = useState(true);
  const [formState, setFormState] = useState(() => ({ ...getDefaultRange(), interval: "month" as ReportInterval }));
  const [savingsMonthsBack, setSavingsMonthsBack] = useState(6);

  const savingsRange = useMemo(() => getSavingsMonthRange(savingsMonthsBack), [savingsMonthsBack]);
  const { data: savingsTrend, isLoading: savingsTrendLoading, error: savingsTrendError } = useQuery({
    queryKey: ["savings-trend", savingsRange],
    queryFn: () => SavingsGoalsApi.getTrend(savingsRange),
  });

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ["report-summary", filters],
    queryFn: () => ReportsApi.getSummary(filters),
  });

  const { data: trend, isLoading: trendLoading, error: trendError } = useQuery({
    queryKey: ["report-trend", filters, interval],
    queryFn: () => ReportsApi.getTrend({ ...filters, interval }),
  });

  const previousRange = useMemo(() => getPreviousRange(filters.startDate, filters.endDate), [filters]);

  const { data: previousSummary } = useQuery({
    queryKey: ["report-summary-prev", previousRange],
    queryFn: () => ReportsApi.getSummary(previousRange!),
    enabled: compareEnabled && !!previousRange,
  });

  const currencies = useMemo(
    () => (summary ? [...new Set(summary.overall.map((o) => o.currency))].sort() : []),
    [summary]
  );
  const currencyColor = (currency: string) =>
    CATEGORICAL_PALETTE[currencies.indexOf(currency) % CATEGORICAL_PALETTE.length] ?? CATEGORICAL_PALETTE[0];

  const primaryCurrency = useMemo(() => {
    if (!summary || summary.overall.length === 0) return null;
    return [...summary.overall].sort((a, b) => b.total - a.total)[0].currency;
  }, [summary]);

  // Everything below is compared in the current period's primary currency —
  // comparing across differing currency baskets wouldn't be meaningful.
  const previousComparables = useMemo(() => {
    if (!compareEnabled || !previousSummary || !primaryCurrency) return null;
    return {
      spend: previousSummary.overall.find((o) => o.currency === primaryCurrency)?.total ?? 0,
      entries: previousSummary.overall.reduce((sum, o) => sum + o.count, 0),
      byCategory: new Map(
        previousSummary.byCategory.filter((c) => c.currency === primaryCurrency).map((c) => [c.category, c.total])
      ),
      byPaymentMethod: new Map(
        previousSummary.byPaymentMethod.filter((p) => p.currency === primaryCurrency).map((p) => [p.paymentMethod, p.total])
      ),
    };
  }, [compareEnabled, previousSummary, primaryCurrency]);

  const categoryRows = useMemo(() => {
    if (!summary || !primaryCurrency) return [];
    const grouped = groupByKey<CategoryTotal, CategoryTotal["category"]>(summary.byCategory, (r) => r.category);
    const rows = [...grouped.entries()].map(([category, byCurrency]) => {
      const totals = new Map([...byCurrency.entries()].map(([c, v]) => [c, v.total]));
      const counts = [...byCurrency.values()].reduce((sum, v) => sum + v.count, 0);
      const primaryTotal = byCurrency.get(primaryCurrency)?.total ?? 0;
      return {
        category,
        primaryTotal,
        totals,
        count: counts,
        deltaPct: previousComparables ? computeDeltaPct(primaryTotal, previousComparables.byCategory.get(category) ?? 0) : undefined,
      };
    });
    return rows.sort((a, b) => b.primaryTotal - a.primaryTotal);
  }, [summary, primaryCurrency, previousComparables]);

  const paymentRows = useMemo(() => {
    if (!summary || !primaryCurrency) return [];
    const grouped = groupByKey<PaymentMethodTotal, PaymentMethodTotal["paymentMethod"]>(
      summary.byPaymentMethod,
      (r) => r.paymentMethod
    );
    const rows = [...grouped.entries()].map(([paymentMethod, byCurrency]) => {
      const totals = new Map([...byCurrency.entries()].map(([c, v]) => [c, v.total]));
      const counts = [...byCurrency.values()].reduce((sum, v) => sum + v.count, 0);
      const primaryTotal = byCurrency.get(primaryCurrency)?.total ?? 0;
      return {
        paymentMethod,
        primaryTotal,
        totals,
        count: counts,
        deltaPct: previousComparables
          ? computeDeltaPct(primaryTotal, previousComparables.byPaymentMethod.get(paymentMethod) ?? 0)
          : undefined,
      };
    });
    return rows.sort((a, b) => b.primaryTotal - a.primaryTotal);
  }, [summary, primaryCurrency, previousComparables]);

  const maxCategoryTotal = Math.max(1, ...categoryRows.map((r) => r.primaryTotal));
  const maxPaymentTotal = Math.max(1, ...paymentRows.map((r) => r.primaryTotal));

  const totalEntries = summary?.overall.reduce((sum, o) => sum + o.count, 0) ?? 0;
  const primarySpend = primaryCurrency ? summary?.overall.find((o) => o.currency === primaryCurrency)?.total ?? 0 : 0;
  const spendDeltaPct = previousComparables ? computeDeltaPct(primarySpend, previousComparables.spend) : undefined;
  const entriesDeltaPct = previousComparables ? computeDeltaPct(totalEntries, previousComparables.entries) : undefined;

  const applyFilters = (e: FormEvent) => {
    e.preventDefault();
    setFilters({
      startDate: formState.startDate || undefined,
      endDate: formState.endDate || undefined,
    });
    setInterval(formState.interval);
  };

  const resetFilters = () => {
    const defaults = getDefaultRange();
    setFormState({ ...defaults, interval: "month" });
    setFilters(defaults);
    setInterval("month");
  };

  const hasData = (summary?.overall.length ?? 0) > 0;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Reports</h1>

      <form
        onSubmit={applyFilters}
        className="mb-6 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4"
      >
        <input
          aria-label="Start date"
          type="date"
          value={formState.startDate}
          onChange={(e) => setFormState((s) => ({ ...s, startDate: e.target.value }))}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#2a78d6] focus:outline-none"
        />
        <input
          aria-label="End date"
          type="date"
          value={formState.endDate}
          onChange={(e) => setFormState((s) => ({ ...s, endDate: e.target.value }))}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#2a78d6] focus:outline-none"
        />
        <select
          aria-label="Trend interval"
          value={formState.interval}
          onChange={(e) => setFormState((s) => ({ ...s, interval: e.target.value as ReportInterval }))}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#2a78d6] focus:outline-none"
        >
          <option value="day">Daily trend</option>
          <option value="week">Weekly trend</option>
          <option value="month">Monthly trend</option>
        </select>
        <div className="flex gap-2">
          <button
            type="submit"
            className="w-full rounded-md bg-[#2a78d6] px-3 py-2 text-sm font-medium text-white hover:bg-[#184f95]"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Reset
          </button>
        </div>
        <label className="col-span-2 flex items-center gap-2 text-sm text-slate-600 sm:col-span-4">
          <input
            type="checkbox"
            checked={compareEnabled}
            onChange={(e) => setCompareEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-[#2a78d6] focus:ring-[#2a78d6]"
          />
          Compare to previous period
          {compareEnabled && previousRange && (
            <span className="text-xs text-slate-400">
              ({previousRange.startDate} – {previousRange.endDate})
            </span>
          )}
        </label>
      </form>

      {(summaryError || trendError) && (
        <p className="mb-4 text-sm text-red-600">{getErrorMessage(summaryError ?? trendError)}</p>
      )}
      {(summaryLoading || trendLoading) && <p className="text-sm text-slate-500">Loading…</p>}

      {summary && !hasData && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-slate-400">
          No cost data for this range.
        </div>
      )}

      {summary && hasData && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Entries"
              value={totalEntries.toLocaleString()}
              delta={entriesDeltaPct !== undefined ? <DeltaBadge pct={entriesDeltaPct} /> : undefined}
            />
            <StatTile
              label="Total spend"
              value={joinCurrencyTotals(new Map(summary.overall.map((o) => [o.currency, o.total])))}
              delta={spendDeltaPct !== undefined ? <DeltaBadge pct={spendDeltaPct} tone="spend" /> : undefined}
            />
            <StatTile
              label="Top category"
              value={
                categoryRows[0] ? (
                  <span className="flex items-center gap-2 text-base">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[categoryRows[0].category] }}
                    />
                    {categoryRows[0].category}
                  </span>
                ) : (
                  "—"
                )
              }
            />
            <StatTile label="Top payment method" value={paymentRows[0]?.paymentMethod ?? "—"} />
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Spending trend</h2>
              <div className="flex rounded-md border border-slate-300 p-0.5 text-sm">
                <button
                  type="button"
                  onClick={() => setTrendView("chart")}
                  className={`rounded px-3 py-1 font-medium ${
                    trendView === "chart" ? "bg-[#2a78d6] text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Graph
                </button>
                <button
                  type="button"
                  onClick={() => setTrendView("table")}
                  className={`rounded px-3 py-1 font-medium ${
                    trendView === "table" ? "bg-[#2a78d6] text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Table
                </button>
              </div>
            </div>
            {trend && trendView === "chart" && (
              <TrendChart data={trend.data} interval={trend.interval} currencyColor={currencyColor} />
            )}
            {trend && trendView === "table" && <TrendTable data={trend.data} interval={trend.interval} />}
          </div>

          <div className="mb-6 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">By category</h2>
              <div className="space-y-3">
                {categoryRows.map((row) => (
                  <BarRow
                    key={row.category}
                    dot={CATEGORY_COLORS[row.category]}
                    label={row.category}
                    pct={(row.primaryTotal / maxCategoryTotal) * 100}
                    amountLabel={joinCurrencyTotals(row.totals)}
                    countLabel={`${row.count} ${row.count === 1 ? "entry" : "entries"}`}
                    deltaPct={row.deltaPct}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">By payment method</h2>
              <div className="space-y-3">
                {paymentRows.map((row) => (
                  <BarRow
                    key={row.paymentMethod}
                    dot="#2a78d6"
                    label={row.paymentMethod}
                    pct={(row.primaryTotal / maxPaymentTotal) * 100}
                    amountLabel={joinCurrencyTotals(row.totals)}
                    countLabel={`${row.count} ${row.count === 1 ? "entry" : "entries"}`}
                    deltaPct={row.deltaPct}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Income &amp; savings trend</h2>
          <select
            aria-label="Months back"
            value={savingsMonthsBack}
            onChange={(e) => setSavingsMonthsBack(Number(e.target.value))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-[#2a78d6] focus:outline-none"
          >
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
        </div>

        {savingsTrendError && <p className="text-sm text-red-600">{getErrorMessage(savingsTrendError)}</p>}
        {savingsTrendLoading && <p className="text-sm text-slate-500">Loading…</p>}

        {savingsTrend && savingsTrend.data.every((m) => m.breakdown.length === 0) && (
          <p className="text-sm text-slate-400">
            No income, costs, or savings goals recorded in this range yet.
          </p>
        )}

        {savingsTrend && savingsTrend.data.some((m) => m.breakdown.length > 0) && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-4">Month</th>
                  <th className="py-2 pr-4">Currency</th>
                  <th className="py-2 pr-4">Income</th>
                  <th className="py-2 pr-4">Spent</th>
                  <th className="py-2 pr-4">Actual saved</th>
                  <th className="py-2 pr-4">Goal</th>
                  <th className="py-2">Difference</th>
                </tr>
              </thead>
              <tbody>
                {savingsTrend.data.flatMap((m) =>
                  m.breakdown.map((row) => (
                    <tr key={`${m.year}-${m.month}-${row.currency}`} className="border-b border-slate-100">
                      <td className="py-2 pr-4 text-slate-500">{monthLabel(m.year, m.month)}</td>
                      <td className="py-2 pr-4 font-medium text-slate-900">{row.currency}</td>
                      <td className="py-2 pr-4">{currencyFormatter(row.income, row.currency)}</td>
                      <td className="py-2 pr-4">{currencyFormatter(row.spent, row.currency)}</td>
                      <td className="py-2 pr-4">{currencyFormatter(row.actualSaved, row.currency)}</td>
                      <td className="py-2 pr-4">{currencyFormatter(row.goalTotal, row.currency)}</td>
                      <td className={`py-2 font-semibold ${row.difference >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {row.difference >= 0 ? "+" : ""}
                        {currencyFormatter(row.difference, row.currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
