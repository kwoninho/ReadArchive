"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useBookStore } from "@/stores/book-store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { mapBookFromDB } from "@/stores/book-store";
import { isOptimizable } from "@/lib/image";
import type { Book, BookStatus } from "@/types";

const TABS: { status: BookStatus; label: string }[] = [
  { status: "WANT_TO_READ", label: "읽고싶은" },
  { status: "READING", label: "읽는중" },
  { status: "FINISHED", label: "완료" },
];

// 다음 상태로 이동하는 버튼 설정
const NEXT_STATUS: Partial<Record<BookStatus, { label: string; next: BookStatus }>> = {
  WANT_TO_READ: { label: "읽기 시작 ▶", next: "READING" },
  READING: { label: "독서 완료 ✓", next: "FINISHED" },
};

interface MobileBoardProps {
  onAddClick: () => void;
}

export function MobileBoard({ onAddClick }: MobileBoardProps) {
  const [activeTab, setActiveTab] = useState<BookStatus>("WANT_TO_READ");
  const { booksByStatus, moveBook, updateBook } = useBookStore();
  const books = booksByStatus(activeTab);

  const handleMove = async (book: Book, newStatus: BookStatus) => {
    const oldStatus = book.status;
    moveBook(book.id, newStatus);

    try {
      const res = await fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      updateBook(book.id, mapBookFromDB(updated));
      toast.success("상태가 변경되었습니다");
    } catch {
      moveBook(book.id, oldStatus);
      toast.error("상태 변경에 실패했습니다");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 탭 네비게이션 */}
      <div className="flex rounded-lg border bg-muted p-1">
        {TABS.map((tab) => {
          const count = booksByStatus(tab.status).length;
          const isActive = activeTab === tab.status;
          return (
            <button
              key={tab.status}
              onClick={() => setActiveTab(tab.status)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {tab.label}({count})
            </button>
          );
        })}
      </div>

      {/* 책 리스트 */}
      <div className="flex flex-col gap-2">
        {books.map((book) => {
          const nextAction = NEXT_STATUS[book.status];
          return (
            <div key={book.id} className="flex items-center gap-3 rounded-lg border p-3">
              <Link href={`/books/${book.id}`} className="flex flex-1 gap-3">
                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-muted">
                  {book.coverUrl ? (
                    <Image
                      src={book.coverUrl}
                      alt={book.title}
                      fill
                      className="object-cover"
                      sizes="40px"
                      unoptimized={!isOptimizable(book.coverUrl)}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[8px]">📚</div>
                  )}
                </div>
                <div className="flex min-w-0 flex-col justify-center">
                  <p className="truncate text-sm font-medium">{book.title}</p>
                  {book.author && (
                    <p className="truncate text-xs text-muted-foreground">{book.author}</p>
                  )}
                </div>
              </Link>
              {nextAction && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-xs"
                  onClick={() => handleMove(book, nextAction.next)}
                >
                  {nextAction.label}
                </Button>
              )}
            </div>
          );
        })}

        {books.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            책이 없습니다
          </p>
        )}
      </div>

      {/* 책 추가 버튼 */}
      <button
        onClick={onAddClick}
        className="rounded-md border border-dashed py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        + 책 추가
      </button>
    </div>
  );
}
