"use client";

import { useDraggable } from "@dnd-kit/core";
import type { Book } from "@/types";

interface DraggableCardProps {
  book: Book;
  children: React.ReactNode;
}

export function DraggableCard({ book, children }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: book.id,
    data: { book },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={isDragging ? "opacity-30" : ""}
    >
      {children}
    </div>
  );
}
