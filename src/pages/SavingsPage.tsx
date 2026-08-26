import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IncomeApi } from "../api/income";
import { SavingsGoalsApi } from "../api/savingsGoals";
import { getErrorMessage } from "../lib/api";
import { HOUSEHOLD, idOf, useFamilyMembers } from "../lib/familyMeta";
import { PersonSelect } from "../components/PersonSelect";
import { CURRENCIES, DEFAULT_CURRENCY, currencyFormatter } from "../lib/format";


const currentMonthValue = () => new Date().toISOString().slice(0, 7); // "YYYY-MM"

function parseMonthValue(value: string): { year: number; month: number } {
  const [year, month] = value.split("-").map(Number);
  return { year, month };
}

function DifferenceBadge({ amount, currency }: { amount: number; currency: string }) {
  const isPositive = amount >= 0;
  return (
    <span className={`font-semibold ${isPositive ? "text-up" : "text-down"}`}>
      {isPositive ? "+" : ""}
      {currencyFormatter(amount, currency)}
    </span>
  );
}

export function SavingsPage() {
  const [monthValue, setMonthValue] = useState(currentMonthValue());
  const { year, month } = parseMonthValue(monthValue);
  const queryClient = useQueryClient();
  const { members, hasOthers, currentUserId, nameOf } = useFamilyMembers();

  // Which savings picture the summary shows: the whole household, or one
  // person's own income, spending and goals.
  const [scope, setScope] = useState("");

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["income", year, month] });
    queryClient.invalidateQueries({ queryKey: ["savings-goals", year, month] });
    queryClient.invalidateQueries({ queryKey: ["savings-summary", year, month] });
  };

  // --- Income ---
  const { data: incomes } = useQuery({
    queryKey: ["income", year, month],
    queryFn: () => IncomeApi.list({ year, month }),
  });

  // Each earner keeps their own row for the month, so the form edits one
  // person's income at a time.
  const [earner, setEarner] = useState("");
  useEffect(() => {
    if (currentUserId) setEarner((e) => e || currentUserId);
  }, [currentUserId]);

  const existingIncome = incomes?.find((i) => idOf(i.earnedBy) === earner);

  const [incomeForm, setIncomeForm] = useState({ amount: "", currency: DEFAULT_CURRENCY });
  const [incomeError, setIncomeError] = useState<string | null>(null);

  useEffect(() => {
    setIncomeForm({
      amount: existingIncome ? String(existingIncome.amount) : "",
      currency: existingIncome?.currency ?? DEFAULT_CURRENCY,
    });
    setIncomeError(null);
  }, [existingIncome, monthValue, earner]);

  const saveIncomeMutation = useMutation({
    mutationFn: () => {
      const payload = {
        year,
        month,
        amount: Number(incomeForm.amount),
        currency: incomeForm.currency,
        earnedBy: earner || undefined,
      };
      return existingIncome ? IncomeApi.update(existingIncome._id, payload) : IncomeApi.create(payload);
    },
    onSuccess: invalidateAll,
    onError: (err) => setIncomeError(getErrorMessage(err)),
  });

  const handleIncomeSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIncomeError(null);
    saveIncomeMutation.mutate();
  };

  // --- Savings goals ---
  const { data: goals } = useQuery({
    queryKey: ["savings-goals", year, month],
    queryFn: () => SavingsGoalsApi.list({ year, month }),
  });

  const [goalForm, setGoalForm] = useState({
    purpose: "",
    targetAmount: "",
    currency: DEFAULT_CURRENCY,
    member: HOUSEHOLD,
  });
  const [goalError, setGoalError] = useState<string | null>(null);

  const addGoalMutation = useMutation({
    mutationFn: () =>
      SavingsGoalsApi.create({
        year,
        month,
        purpose: goalForm.purpose,
        targetAmount: Number(goalForm.targetAmount),
        currency: goalForm.currency,
        member: goalForm.member,
      }),
    onSuccess: () => {
      setGoalForm((f) => ({ ...f, purpose: "", targetAmount: "" }));
      invalidateAll();
    },
    onError: (err) => setGoalError(getErrorMessage(err)),
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (id: string) => SavingsGoalsApi.remove(id),
    onSuccess: invalidateAll,
  });

  const handleGoalSubmit = (e: FormEvent) => {
    e.preventDefault();
    setGoalError(null);
    addGoalMutation.mutate();
  };

  // --- Summary ---
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery({
    // An empty scope means the whole household, which the API expresses by
    // leaving the member parameter off entirely.
    queryKey: ["savings-summary", year, month, scope],
    queryFn: () => SavingsGoalsApi.getSummary(year, month, scope || undefined),
  });

  const scopeLabel = scope ? nameOf(scope) : "the whole family";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Savings</h1>
        <input
          aria-label="Month"
          type="month"
          value={monthValue}
          onChange={(e) => setMonthValue(e.target.value)}
          className="input"
        />
      </div>

      <div className="mb-6 grid gap-6 sm:grid-cols-2">
        {/* Income */}
        <div className="card-lg">
          <h2 className="mb-4 text-sm font-semibold text-ink-muted">
            Income for {monthValue}
          </h2>

          {hasOthers && incomes && incomes.length > 0 && (
            <div className="mb-4 space-y-1 text-sm">
              {incomes.map((income) => (
                <div key={income._id} className="flex justify-between text-ink-muted">
                  <span>{nameOf(idOf(income.earnedBy))}</span>
                  <span className="numeric text-ink">
                    {currencyFormatter(income.amount, income.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleIncomeSubmit} className="space-y-4">
            <PersonSelect
              id="income-earner"
              label="Earned by"
              value={earner}
              onChange={setEarner}
              hideWhenSolo
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="income-amount" className="block text-sm font-medium text-ink-muted">
                  Amount
                </label>
                <input
                  id="income-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={incomeForm.amount}
                  onChange={(e) => setIncomeForm((f) => ({ ...f, amount: e.target.value }))}
                  className="input mt-1"
                />
              </div>
              <div>
                <label htmlFor="income-currency" className="block text-sm font-medium text-ink-muted">
                  Currency
                </label>
                <select
                  id="income-currency"
                  required
                  value={incomeForm.currency}
                  onChange={(e) => setIncomeForm((f) => ({ ...f, currency: e.target.value }))}
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
            {incomeError && <p className="text-sm text-down">{incomeError}</p>}
            <button
              type="submit"
              disabled={saveIncomeMutation.isPending}
              className="btn btn-primary"
            >
              {saveIncomeMutation.isPending ? "Saving…" : existingIncome ? "Update income" : "Save income"}
            </button>
          </form>
        </div>

        {/* Savings goals */}
        <div className="card-lg">
          <h2 className="mb-4 text-sm font-semibold text-ink-muted">
            Savings goals for {monthValue}
          </h2>

          <div className="mb-4 space-y-2">
            {goals?.length === 0 && (
              <p className="text-sm text-ink-dim">No savings goals set for this month yet.</p>
            )}
            {goals?.map((goal) => (
              <div
                key={goal._id}
                className="flex items-center justify-between rounded-md border border-line px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{goal.purpose}</p>
                  <p className="text-xs text-ink-muted">
                    {currencyFormatter(goal.targetAmount, goal.currency)}
                    {hasOthers && (
                      <span className="text-ink-dim">
                        {" "}
                        · {goal.member ? nameOf(idOf(goal.member)) : "Household"}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteGoalMutation.mutate(goal._id)}
                  className="text-sm text-down hover:text-down"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleGoalSubmit} className="space-y-3 border-t border-line pt-4">
            <div>
              <label htmlFor="goal-purpose" className="block text-sm font-medium text-ink-muted">
                Purpose
              </label>
              <input
                id="goal-purpose"
                required
                placeholder="e.g. Vacation, Emergency fund"
                value={goalForm.purpose}
                onChange={(e) => setGoalForm((f) => ({ ...f, purpose: e.target.value }))}
                className="input mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="goal-amount" className="block text-sm font-medium text-ink-muted">
                  Target amount
                </label>
                <input
                  id="goal-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={goalForm.targetAmount}
                  onChange={(e) => setGoalForm((f) => ({ ...f, targetAmount: e.target.value }))}
                  className="input mt-1"
                />
              </div>
              <div>
                <label htmlFor="goal-currency" className="block text-sm font-medium text-ink-muted">
                  Currency
                </label>
                <select
                  id="goal-currency"
                  required
                  value={goalForm.currency}
                  onChange={(e) => setGoalForm((f) => ({ ...f, currency: e.target.value }))}
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
            <PersonSelect
              id="goal-member"
              label="Saving for"
              value={goalForm.member}
              onChange={(v) => setGoalForm((f) => ({ ...f, member: v }))}
              sharedOption={{ value: HOUSEHOLD, label: "Household" }}
              hideWhenSolo
            />
            {goalError && <p className="text-sm text-down">{goalError}</p>}
            <button
              type="submit"
              disabled={addGoalMutation.isPending}
              className="btn btn-primary"
            >
              {addGoalMutation.isPending ? "Adding…" : "+ Add goal"}
            </button>
          </form>
        </div>
      </div>

      {/* Summary */}
      <div className="card-lg">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-ink-muted">Summary for {monthValue}</h2>
          {hasOthers && (
            <select
              aria-label="Summary scope"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="input w-auto"
            >
              <option value="">Whole family</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {summaryError && <p className="text-sm text-down">{getErrorMessage(summaryError)}</p>}
        {summaryLoading && <p className="text-sm text-ink-muted">Loading…</p>}

        {summary && summary.breakdown.length === 0 && (
          <p className="text-sm text-ink-dim">
            No income, costs, or savings goals recorded for {scopeLabel} this month yet.
          </p>
        )}

        {summary && summary.breakdown.length > 0 && (
          <div className="overflow-x-auto">
            <table className="numeric w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-muted">
                  <th className="py-2 pr-4">Currency</th>
                  <th className="py-2 pr-4">Income</th>
                  <th className="py-2 pr-4">Spent</th>
                  <th className="py-2 pr-4">Actual saved</th>
                  <th className="py-2 pr-4">Goal</th>
                  <th className="py-2">Difference</th>
                </tr>
              </thead>
              <tbody>
                {summary.breakdown.map((row) => (
                  <tr key={row.currency} className="border-b border-line">
                    <td className="py-2 pr-4 font-medium text-ink">{row.currency}</td>
                    <td className="py-2 pr-4">{currencyFormatter(row.income, row.currency)}</td>
                    <td className="py-2 pr-4">{currencyFormatter(row.spent, row.currency)}</td>
                    <td className="py-2 pr-4">{currencyFormatter(row.actualSaved, row.currency)}</td>
                    <td className="py-2 pr-4">{currencyFormatter(row.goalTotal, row.currency)}</td>
                    <td className="py-2">
                      <DifferenceBadge amount={row.difference} currency={row.currency} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
