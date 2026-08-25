import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IncomeApi } from "../api/income";
import { SavingsGoalsApi } from "../api/savingsGoals";
import { getErrorMessage } from "../lib/api";
import { currencyFormatter } from "../lib/format";

const CURRENCIES = ["SEK", "BDT", "USD", "CAD", "AUD"];

const currentMonthValue = () => new Date().toISOString().slice(0, 7); // "YYYY-MM"

function parseMonthValue(value: string): { year: number; month: number } {
  const [year, month] = value.split("-").map(Number);
  return { year, month };
}

function DifferenceBadge({ amount, currency }: { amount: number; currency: string }) {
  const isPositive = amount >= 0;
  return (
    <span className={`font-semibold ${isPositive ? "text-green-600" : "text-red-600"}`}>
      {isPositive ? "+" : ""}
      {currencyFormatter(amount, currency)}
    </span>
  );
}

export function SavingsPage() {
  const [monthValue, setMonthValue] = useState(currentMonthValue());
  const { year, month } = parseMonthValue(monthValue);
  const queryClient = useQueryClient();

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
  const existingIncome = incomes?.[0];

  const [incomeForm, setIncomeForm] = useState({ amount: "", currency: "USD" });
  const [incomeError, setIncomeError] = useState<string | null>(null);

  useEffect(() => {
    setIncomeForm({
      amount: existingIncome ? String(existingIncome.amount) : "",
      currency: existingIncome?.currency ?? "USD",
    });
    setIncomeError(null);
  }, [existingIncome, monthValue]);

  const saveIncomeMutation = useMutation({
    mutationFn: () => {
      const payload = { year, month, amount: Number(incomeForm.amount), currency: incomeForm.currency };
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

  const [goalForm, setGoalForm] = useState({ purpose: "", targetAmount: "", currency: "USD" });
  const [goalError, setGoalError] = useState<string | null>(null);

  const addGoalMutation = useMutation({
    mutationFn: () =>
      SavingsGoalsApi.create({
        year,
        month,
        purpose: goalForm.purpose,
        targetAmount: Number(goalForm.targetAmount),
        currency: goalForm.currency,
      }),
    onSuccess: () => {
      setGoalForm({ purpose: "", targetAmount: "", currency: goalForm.currency });
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
    queryKey: ["savings-summary", year, month],
    queryFn: () => SavingsGoalsApi.getSummary(year, month),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Savings</h1>
        <input
          aria-label="Month"
          type="month"
          value={monthValue}
          onChange={(e) => setMonthValue(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#2a78d6] focus:outline-none"
        />
      </div>

      <div className="mb-6 grid gap-6 sm:grid-cols-2">
        {/* Income */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Income for {monthValue}
          </h2>
          <form onSubmit={handleIncomeSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="income-amount" className="block text-sm font-medium text-slate-700">
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
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#2a78d6] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="income-currency" className="block text-sm font-medium text-slate-700">
                  Currency
                </label>
                <select
                  id="income-currency"
                  required
                  value={incomeForm.currency}
                  onChange={(e) => setIncomeForm((f) => ({ ...f, currency: e.target.value }))}
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
            {incomeError && <p className="text-sm text-red-600">{incomeError}</p>}
            <button
              type="submit"
              disabled={saveIncomeMutation.isPending}
              className="rounded-md bg-[#2a78d6] px-4 py-2 text-sm font-medium text-white hover:bg-[#184f95] disabled:opacity-50"
            >
              {saveIncomeMutation.isPending ? "Saving…" : existingIncome ? "Update income" : "Save income"}
            </button>
          </form>
        </div>

        {/* Savings goals */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Savings goals for {monthValue}
          </h2>

          <div className="mb-4 space-y-2">
            {goals?.length === 0 && (
              <p className="text-sm text-slate-400">No savings goals set for this month yet.</p>
            )}
            {goals?.map((goal) => (
              <div
                key={goal._id}
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{goal.purpose}</p>
                  <p className="text-xs text-slate-500">
                    {currencyFormatter(goal.targetAmount, goal.currency)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteGoalMutation.mutate(goal._id)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleGoalSubmit} className="space-y-3 border-t border-slate-100 pt-4">
            <div>
              <label htmlFor="goal-purpose" className="block text-sm font-medium text-slate-700">
                Purpose
              </label>
              <input
                id="goal-purpose"
                required
                placeholder="e.g. Vacation, Emergency fund"
                value={goalForm.purpose}
                onChange={(e) => setGoalForm((f) => ({ ...f, purpose: e.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#2a78d6] focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="goal-amount" className="block text-sm font-medium text-slate-700">
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
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#2a78d6] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="goal-currency" className="block text-sm font-medium text-slate-700">
                  Currency
                </label>
                <select
                  id="goal-currency"
                  required
                  value={goalForm.currency}
                  onChange={(e) => setGoalForm((f) => ({ ...f, currency: e.target.value }))}
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
            {goalError && <p className="text-sm text-red-600">{goalError}</p>}
            <button
              type="submit"
              disabled={addGoalMutation.isPending}
              className="rounded-md bg-[#2a78d6] px-4 py-2 text-sm font-medium text-white hover:bg-[#184f95] disabled:opacity-50"
            >
              {addGoalMutation.isPending ? "Adding…" : "+ Add goal"}
            </button>
          </form>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Summary for {monthValue}</h2>

        {summaryError && <p className="text-sm text-red-600">{getErrorMessage(summaryError)}</p>}
        {summaryLoading && <p className="text-sm text-slate-500">Loading…</p>}

        {summary && summary.breakdown.length === 0 && (
          <p className="text-sm text-slate-400">
            No income, costs, or savings goals recorded for this month yet.
          </p>
        )}

        {summary && summary.breakdown.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
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
                  <tr key={row.currency} className="border-b border-slate-100">
                    <td className="py-2 pr-4 font-medium text-slate-900">{row.currency}</td>
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
