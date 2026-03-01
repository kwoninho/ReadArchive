"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Book, BookStatus } from "@/types";
import { BookCard } from "@/components/book/book-card";
import { DraggableCard } from "./draggable-card";

const STATUS_CONFIG: Record<BookStatus, { label: string; emoji: string }> = {
  WANT_TO_READ: { label: "읽고 싶은 책", emoji: "📋" },
  READING: { label: "읽는 중", emoji: "📖" },
  FINISHED: { label: "다 읽은 책", emoji: "✅" },
};

interface BoardColumnProps {
  status: BookStatus;
  books: Book[];
  onAddClick?: () => void;
}

export function BoardColumn({ status, books, onAddClick }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const config = STATUS_CONFIG[status];

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-lg border bg-muted/30 p-3 ${
        isOver ? "ring-2 ring-primary/50" : ""
      }`}
    >
      {/* 칼럼 헤더 */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {config.emoji} {config.label}
          <span className="ml-1 text-muted-foreground">({books.length})</span>
        </h2>
      </div>

      {/* 책 카드 리스트 */}
      <div className="flex flex-1 flex-col gap-2">
        {books.map((book) => (
          <DraggableCard key={book.id} book={book}>
            <BookCard book={book} />
          </DraggableCard>
        ))}

        {books.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            책이 없습니다
          </p>
        )}
      </div>

      {/* 책 추가 버튼 (읽고 싶은 책 칼럼에만) */}
      {onAddClick && (
        <button
          onClick={onAddClick}
          className="mt-2 rounded-md border border-dashed py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          + 책 추가
        </button>
      )}
    </div>
  );
}
