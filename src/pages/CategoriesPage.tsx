import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CategoriesApi } from "../api/categories";
import { getErrorMessage } from "../lib/api";
import { useCategories } from "../lib/categoryMeta";
import { CATEGORICAL_PALETTE } from "../lib/format";
import type { Category } from "../types";

const DEFAULT_NEW_COLOR = CATEGORICAL_PALETTE[0];

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const { data: categories, isLoading, error } = useCategories();

  const [newForm, setNewForm] = useState({ name: "", color: DEFAULT_NEW_COLOR });
  const [newError, setNewError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string; color: string } | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["categories"] });

  const addMutation = useMutation({
    mutationFn: () => CategoriesApi.create(newForm),
    onSuccess: () => {
      setNewForm({ name: "", color: DEFAULT_NEW_COLOR });
      invalidate();
    },
    onError: (err) => setNewError(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: () => CategoriesApi.update(editing!.id, { name: editing!.name, color: editing!.color }),
    onSuccess: () => {
      setEditing(null);
      invalidate();
    },
    onError: (err) => setEditError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => CategoriesApi.remove(id),
    onSuccess: invalidate,
  });

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    setNewError(null);
    addMutation.mutate();
  };

  const handleUpdate = (e: FormEvent) => {
    e.preventDefault();
    setEditError(null);
    updateMutation.mutate();
  };

  const startEditing = (category: Category) => {
    setEditError(null);
    setEditing({ id: category._id, name: category.name, color: category.color });
  };

  const handleDelete = (category: Category) => {
    if (
      confirm(
        `Delete "${category.name}"?\n\nExisting costs already saved under this category keep their label, but you won't be able to pick it for new costs.`
      )
    ) {
      deleteMutation.mutate(category._id);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold text-ink">Categories</h1>

      <form
        onSubmit={handleAdd}
        className="mb-6 card-lg"
      >
        <h2 className="mb-4 text-sm font-semibold text-ink-muted">Add a category</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-48 flex-1">
            <label htmlFor="new-name" className="block text-sm font-medium text-ink-muted">
              Name
            </label>
            <input
              id="new-name"
              required
              maxLength={50}
              placeholder="e.g. Medicine, School, Tour"
              value={newForm.name}
              onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
              className="input mt-1"
            />
          </div>
          <div>
            <label htmlFor="new-color" className="block text-sm font-medium text-ink-muted">
              Color
            </label>
            <input
              id="new-color"
              type="color"
              value={newForm.color}
              onChange={(e) => setNewForm((f) => ({ ...f, color: e.target.value }))}
              className="mt-1 h-9 w-16 cursor-pointer rounded-md border border-line-strong"
            />
          </div>
          <button
            type="submit"
            disabled={addMutation.isPending}
            className="btn btn-primary"
          >
            {addMutation.isPending ? "Adding…" : "+ Add"}
          </button>
        </div>
        {newError && <p className="mt-3 text-sm text-down">{newError}</p>}
      </form>

      {error && <p className="mb-4 text-sm text-down">{getErrorMessage(error)}</p>}
      {isLoading && <p className="text-sm text-ink-muted">Loading…</p>}

      <div className="space-y-2">
        {categories?.length === 0 && (
          <div className="rounded-xl border border-dashed border-line-strong bg-surface py-10 text-center text-ink-dim">
            No categories yet.
          </div>
        )}

        {categories?.map((category) =>
          editing?.id === category._id ? (
            <form
              key={category._id}
              onSubmit={handleUpdate}
              className="rounded-xl border border-accent bg-surface p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  aria-label="Color"
                  value={editing.color}
                  onChange={(e) => setEditing((s) => (s ? { ...s, color: e.target.value } : s))}
                  className="h-9 w-14 shrink-0 cursor-pointer rounded-md border border-line-strong"
                />
                <input
                  aria-label="Name"
                  required
                  maxLength={50}
                  value={editing.name}
                  onChange={(e) => setEditing((s) => (s ? { ...s, name: e.target.value } : s))}
                  className="min-w-40 flex-1 input"
                />
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {updateMutation.isPending ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
              </div>
              {editError && <p className="mt-3 text-sm text-down">{editError}</p>}
            </form>
          ) : (
            <div
              key={category._id}
              className="flex items-center justify-between gap-4 card"
            >
              <span className="flex items-center gap-3">
                <span
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="font-medium text-ink">{category.name}</span>
              </span>
              <div className="flex shrink-0 gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => startEditing(category)}
                  className="text-ink-muted hover:text-accent"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(category)}
                  className="text-down hover:text-down"
                >
                  Delete
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
