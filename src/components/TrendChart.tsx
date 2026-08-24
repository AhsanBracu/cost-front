import { useMemo, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { currencyFormatter } from "../lib/format";
import type { ReportInterval, TrendPoint } from "../types";

const WIDTH = 700;
const HEIGHT = 260;
const PADDING = { top: 16, right: 16, bottom: 32, left: 56 };

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const residual = value / magnitude;
  const niceResidual = residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1;
  return niceResidual * magnitude;
}

function formatPeriodLabel(period: string, interval: ReportInterval): string {
  if (interval === "month") {
    const [year, month] = period.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  if (interval === "day") {
    return new Date(period).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return period.replace(/^\d{4}-/, "");
}

export function TrendTable({ data, interval }: { data: TrendPoint[]; interval: ReportInterval }) {
  const rows = useMemo(
    () => [...data].sort((a, b) => a.period.localeCompare(b.period) || a.currency.localeCompare(b.currency)),
    [data]
  );

  if (rows.length === 0) {
    return <p className="text-sm text-slate-400">No data for this range.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th className="py-2 pr-4 font-medium">Period</th>
            <th className="py-2 pr-4 font-medium">Currency</th>
            <th className="py-2 pr-4 text-right font-medium">Total</th>
            <th className="py-2 text-right font-medium">Entries</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.period}-${row.currency}`} className="border-b border-slate-100 last:border-0">
              <td className="py-2 pr-4 text-slate-700">{formatPeriodLabel(row.period, interval)}</td>
              <td className="py-2 pr-4 text-slate-700">{row.currency}</td>
              <td className="py-2 pr-4 text-right font-medium text-slate-900">
                {currencyFormatter(row.total, row.currency)}
              </td>
              <td className="py-2 text-right text-slate-700">{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TrendChart({
  data,
  interval,
  currencyColor,
}: {
  data: TrendPoint[];
  interval: ReportInterval;
  currencyColor: (currency: string) => string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { periods, currencies, seriesByCurrency, yMax } = useMemo(() => {
    const periodSet = new Set<string>();
    const currencySet = new Set<string>();
    const byCurrency = new Map<string, Map<string, number>>();
    for (const point of data) {
      periodSet.add(point.period);
      currencySet.add(point.currency);
      if (!byCurrency.has(point.currency)) byCurrency.set(point.currency, new Map());
      byCurrency.get(point.currency)!.set(point.period, point.total);
    }
    const periods = [...periodSet].sort();
    const currencies = [...currencySet].sort();
    let max = 0;
    for (const totals of byCurrency.values()) {
      for (const total of totals.values()) max = Math.max(max, total);
    }
    return { periods, currencies, seriesByCurrency: byCurrency, yMax: niceMax(max) };
  }, [data]);

  if (periods.length === 0) {
    return <p className="text-sm text-slate-400">No data for this range.</p>;
  }

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const stepX = periods.length > 1 ? plotWidth / (periods.length - 1) : 0;
  const xAt = (i: number) => PADDING.left + (periods.length > 1 ? i * stepX : plotWidth / 2);
  const yAt = (value: number) => PADDING.top + plotHeight - (value / yMax) * plotHeight;

  const yTicks = [0, yMax / 2, yMax];

  // Show at most ~6 x labels, always including the first and last period.
  const labelEvery = Math.max(1, Math.ceil(periods.length / 6));
  const showLabel = (i: number) => i === 0 || i === periods.length - 1 || i % labelEvery === 0;

  const handlePointerMove = (e: ReactPointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const idx = periods.length > 1 ? Math.round((relX - PADDING.left) / stepX) : 0;
    setHoverIndex(Math.min(Math.max(idx, 0), periods.length - 1));
  };

  const hoveredPeriod = hoverIndex !== null ? periods[hoverIndex] : null;
  const tooltipLeftPct = hoverIndex !== null ? (xAt(hoverIndex) / WIDTH) * 100 : 0;

  return (
    <div className="relative">
      {currencies.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
          {currencies.map((currency) => (
            <span key={currency} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: currencyColor(currency) }} />
              {currency}
            </span>
          ))}
        </div>
      )}

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Spending trend over time">
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={yAt(tick)}
              y2={yAt(tick)}
              stroke="#e1e0d9"
              strokeWidth={1}
            />
            <text x={PADDING.left - 8} y={yAt(tick)} textAnchor="end" dominantBaseline="middle" className="fill-slate-400 text-[10px]">
              {tick >= 1000 ? `${(tick / 1000).toFixed(tick % 1000 === 0 ? 0 : 1)}K` : Math.round(tick)}
            </text>
          </g>
        ))}

        {periods.map((period, i) =>
          showLabel(i) ? (
            <text
              key={period}
              x={xAt(i)}
              y={HEIGHT - PADDING.bottom + 16}
              textAnchor="middle"
              className="fill-slate-400 text-[10px]"
            >
              {formatPeriodLabel(period, interval)}
            </text>
          ) : null
        )}

        {currencies.map((currency) => {
          const totals = seriesByCurrency.get(currency)!;
          const values = periods.map((p) => totals.get(p) ?? 0);
          const color = currencyColor(currency);
          const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(v)}`).join(" ");
          const areaPath =
            currencies.length === 1
              ? `${linePath} L${xAt(values.length - 1)},${yAt(0)} L${xAt(0)},${yAt(0)} Z`
              : null;

          return (
            <g key={currency}>
              {areaPath && <path d={areaPath} fill={color} opacity={0.1} />}
              <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {values.map((v, i) => (
                <circle key={i} cx={xAt(i)} cy={yAt(v)} r={4} fill={color} stroke="#fff" strokeWidth={2} />
              ))}
            </g>
          );
        })}

        {hoverIndex !== null && (
          <line
            x1={xAt(hoverIndex)}
            x2={xAt(hoverIndex)}
            y1={PADDING.top}
            y2={HEIGHT - PADDING.bottom}
            stroke="#c3c2b7"
            strokeWidth={1}
          />
        )}

        <rect
          x={PADDING.left}
          y={PADDING.top}
          width={plotWidth}
          height={plotHeight}
          fill="transparent"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        />
      </svg>

      {hoveredPeriod && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
          style={{ left: `${tooltipLeftPct}%` }}
        >
          <p className="mb-1 font-medium text-slate-700">{formatPeriodLabel(hoveredPeriod, interval)}</p>
          {currencies.map((currency) => {
            const value = seriesByCurrency.get(currency)?.get(hoveredPeriod) ?? 0;
            return (
              <p key={currency} className="flex items-center gap-1.5 text-slate-600">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: currencyColor(currency) }} />
                <span className="font-semibold text-slate-900">{currencyFormatter(value, currency)}</span>
                {currencies.length > 1 && <span>{currency}</span>}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
