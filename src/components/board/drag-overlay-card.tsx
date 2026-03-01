"use client";

import type { Book } from "@/types";

interface DragOverlayCardProps {
  book: Book;
}

// 드래그 중 표시되는 오버레이 카드
export function DragOverlayCard({ book }: DragOverlayCardProps) {
  return (
    <div className="w-64 rounded-lg border bg-card p-3 shadow-lg">
      <p className="truncate text-sm font-medium">{book.title}</p>
      {book.author && (
        <p className="truncate text-xs text-muted-foreground">{book.author}</p>
      )}
    </div>
  );
}
