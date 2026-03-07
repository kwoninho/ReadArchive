import { Badge } from "@/components/ui/badge";
import type { Category } from "@/types";

interface CategoryBadgeProps {
  categories: Category[];
  maxCount?: number;
}

export function CategoryBadge({ categories, maxCount }: CategoryBadgeProps) {
  if (!categories || categories.length === 0) return null;

  const visible = maxCount != null ? categories.slice(0, maxCount) : categories;
  const remaining = maxCount != null ? categories.length - maxCount : 0;

  return (
    <ul className="flex flex-wrap gap-1" role="list" aria-label="카테고리">
      {visible.map((category) => (
        <li key={category.id}>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {category.name}
          </Badge>
        </li>
      ))}
      {remaining > 0 && (
        <li>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            +{remaining}
          </Badge>
        </li>
      )}
    </ul>
  );
}
