import { useQuery } from "@tanstack/react-query";
import { CategoriesApi } from "../api/categories";
import { CATEGORICAL_PALETTE } from "./format";

// Costs keep the category *name* they were saved with, so a cost can
// reference a category the user has since renamed or deleted. Those still
// need a color, so unknown names fall back to a name-hashed palette entry
// — stable across renders and reloads rather than random or a single
// grey that would make several unknown categories indistinguishable.
const fallbackColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return CATEGORICAL_PALETTE[Math.abs(hash) % CATEGORICAL_PALETTE.length];
};

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => CategoriesApi.list(),
    staleTime: 5 * 60 * 1000,
  });
}

/** Returns a `(categoryName) => hex color` lookup backed by the user's categories. */
export function useCategoryColor() {
  const { data: categories } = useCategories();

  return (name: string): string => {
    const match = categories?.find((c) => c.name === name);
    return match?.color ?? fallbackColor(name);
  };
}

export function CategoryBadge({ category, color }: { category: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {category}
    </span>
  );
}
