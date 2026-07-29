import { CostCategory } from "../types";

// Fixed categorical order (validated CVD-safe palette) — one hue per
// category, always the same hue regardless of which subset is displayed.
export const CATEGORY_COLORS: Record<CostCategory, string> = {
  [CostCategory.Food]: "#2a78d6",
  [CostCategory.Transport]: "#eb6834",
  [CostCategory.Housing]: "#1baf7a",
  [CostCategory.Utilities]: "#eda100",
  [CostCategory.Entertainment]: "#e87ba4",
  [CostCategory.Health]: "#008300",
  [CostCategory.Shopping]: "#4a3aa7",
  [CostCategory.Other]: "#e34948",
};

export function CategoryBadge({ category }: { category: CostCategory }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: CATEGORY_COLORS[category] }}
      />
      {category}
    </span>
  );
}
