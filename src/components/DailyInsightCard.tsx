import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { InsightsApi } from "../api/insights";
import { getErrorMessage } from "../lib/api";
import { currencyFormatter } from "../lib/format";

/** A signed amount, coloured the way spending reads: more is bad. */
function Delta({ amount, currency }: { amount: number; currency: string }) {
  if (amount === 0) return <span className="text-ink-dim">no change</span>;
  const up = amount > 0;
  return (
    <span className={up ? "text-down" : "text-up"}>
      {up ? "+" : "−"}
      {currencyFormatter(Math.abs(amount), currency)}
    </span>
  );
}

export function DailyInsightCard() {
  const queryClient = useQueryClient();

  // Reading is free and instant, so it runs on every mount.
  const { data, isLoading, error } = useQuery({
    queryKey: ["daily-insight"],
    queryFn: () => InsightsApi.getDaily(),
  });

  // Generating costs money and takes ~10s, so it only happens on click.
  const generate = useMutation({
    mutationFn: () => InsightsApi.generateDaily(),
    onSuccess: (fresh) => queryClient.setQueryData(["daily-insight"], fresh),
  });

  if (isLoading) return null;
  if (error) {
    return <p className="mb-6 text-sm text-down">{getErrorMessage(error)}</p>;
  }
  if (!data) return null;

  const today = data.comparison[0];
  const hasSpending = data.comparison.some((c) => c.today > 0);
  const { narrative, stillCurrent, llmConfigured } = data;

  // Nothing spent today and nothing written about it -- an empty card would
  // just be noise above the list.
  if (!hasSpending && !narrative) return null;

  const buttonLabel = generate.isPending
    ? "Thinking…"
    : narrative
      ? "Refresh"
      : "Explain today";

  return (
    <div className="mb-6 card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-muted">Today</h2>
          {today && (
            <p className="numeric mt-1 text-2xl font-semibold text-ink">
              {currencyFormatter(today.today, today.currency)}{" "}
              <span className="text-sm font-normal text-ink-muted">
                vs yesterday <Delta amount={today.vsYesterday} currency={today.currency} />
              </span>
            </p>
          )}
        </div>

        {llmConfigured && (
          <button
            type="button"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="btn btn-ghost shrink-0"
          >
            {buttonLabel}
          </button>
        )}
      </div>

      {/* The costs moved after this text was written, so say so rather than
          quietly showing an explanation that no longer matches the numbers. */}
      {narrative && !stillCurrent && (
        <p className="mt-3 rounded-md border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
          Costs have changed since this was written. Press Refresh to update it.
        </p>
      )}

      {generate.isPending && (
        <p className="mt-3 text-sm text-ink-muted">
          Looking through today's spending… this takes a few seconds.
        </p>
      )}

      {generate.error && (
        <p className="mt-3 text-sm text-down">{getErrorMessage(generate.error)}</p>
      )}

      {narrative && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="font-medium text-ink">{narrative.mainDriver}</p>
          <p className="mt-1 text-sm text-ink-muted">{narrative.explanation}</p>

          {narrative.suggestions.length > 0 && (
            <ul className="mt-3 space-y-1">
              {narrative.suggestions.map((suggestion) => (
                <li key={suggestion} className="flex gap-2 text-sm text-ink-muted">
                  <span aria-hidden className="text-accent">
                    ·
                  </span>
                  {suggestion}
                </li>
              ))}
            </ul>
          )}

          {data.generatedAt && (
            <p className="mt-3 text-xs text-ink-dim">
              Written {new Date(data.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {data.toolCalls.length > 0 && ` · checked ${data.toolCalls.length} things`}
            </p>
          )}
        </div>
      )}

      {!narrative && !generate.isPending && llmConfigured && (
        <p className="mt-3 text-sm text-ink-dim">
          No explanation yet for today.
        </p>
      )}
    </div>
  );
}
