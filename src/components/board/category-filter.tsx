"use client";

import { useBookStore } from "@/stores/book-store";

export function CategoryFilter() {
  const allCategories = useBookStore((s) => s.allCategories);
  const selectedCategory = useBookStore((s) => s.selectedCategory);
  const setSelectedCategory = useBookStore((s) => s.setSelectedCategory);

  const categories = allCategories();
  if (categories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="카테고리 필터">
      <FilterChip
        label="전체"
        active={selectedCategory === null}
        onClick={() => setSelectedCategory(null)}
      />
      {categories.map((cat) => (
        <FilterChip
          key={cat.id}
          label={cat.name}
          active={selectedCategory === cat.id}
          onClick={() => setSelectedCategory(cat.id)}
        />
      ))}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-active={active}
      onClick={onClick}
      className={`max-w-full truncate rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-accent"
      }`}
    >
      {label}
    </button>
  );
}
