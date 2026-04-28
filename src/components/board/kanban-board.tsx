"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { BoardColumn } from "./board-column";
import { DragOverlayCard } from "./drag-overlay-card";
import { MobileBoard } from "./mobile-board";
import { CategoryFilter } from "./category-filter";
import { SearchModal } from "@/components/search/search-modal";
import { useBookStore, mapBookFromDB } from "@/stores/book-store";
import { useMediaQuery } from "@/hooks/use-media-query";
import { toast } from "sonner";
import { BOOK_STATUSES, type Book, type BookStatus } from "@/types";

interface KanbanBoardProps {
  initialBooks: Record<string, unknown>[];
}

export function KanbanBoard({ initialBooks }: KanbanBoardProps) {
  const {
    setBooks,
    addBook,
    booksByStatus,
    moveBook,
    updateBook,
  } = useBookStore();

  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // 초기 데이터 설정
  useEffect(() => {
    setBooks(initialBooks.map(mapBookFromDB));
  }, [initialBooks, setBooks]);

  // 드래그 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const book = event.active.data.current?.book as Book | undefined;
    setActiveBook(book ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveBook(null);
    const { active, over } = event;
    if (!over) return;

    const bookId = active.id as string;
    const newStatus = over.id as BookStatus;
    const book = active.data.current?.book as Book | undefined;

    if (!book || book.status === newStatus) return;

    const oldStatus = book.status;
    moveBook(bookId, newStatus);

    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error();

      const updated = await res.json();
      updateBook(bookId, mapBookFromDB(updated));
      toast.success("상태가 변경되었습니다");
    } catch {
      moveBook(bookId, oldStatus);
      toast.error("상태 변경에 실패했습니다");
    }
  };

  const handleBookAdded = useCallback(
    (rawBook: Record<string, unknown>) => {
      addBook(mapBookFromDB(rawBook));
    },
    [addBook]
  );

  return (
    <>
      <CategoryFilter />

      {isDesktop ? (
        /* 데스크톱: 4칼럼 드래그앤드롭 칸반 보드 */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-4 gap-4">
            {BOOK_STATUSES.map((status) => (
              <BoardColumn
                key={status}
                status={status}
                books={booksByStatus(status)}
                onAddClick={
                  status === "WANT_TO_READ"
                    ? () => setSearchOpen(true)
                    : undefined
                }
              />
            ))}
          </div>

          <DragOverlay>
            {activeBook ? <DragOverlayCard book={activeBook} /> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        /* 모바일: 탭 네비게이션 + 버튼 기반 상태 변경 */
        <MobileBoard onAddClick={() => setSearchOpen(true)} />
      )}

      <SearchModal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onBookAdded={handleBookAdded}
      />
    </>
  );
}
