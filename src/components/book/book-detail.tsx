"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { StatusSelect } from "./status-select";
import { StarRating } from "./star-rating";
import { NoteList } from "./note-list";
import { ReadingProgress } from "./reading-progress";
import { BookEditForm } from "./book-edit-form";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { mapBookFromDB } from "@/stores/book-store";
import { CategoryBadge } from "./category-badge";
import { formatDate } from "@/lib/format";
import type { Book, BookStatus } from "@/types";

interface BookDetailProps {
  book: Record<string, unknown>;
}

export function BookDetail({ book: rawBook }: BookDetailProps) {
  const router = useRouter();
  const [book, setBook] = useState<Book>(() => mapBookFromDB(rawBook));
  const [isEditing, setIsEditing] = useState(false);
  // mutation 직렬화: 동시 PATCH 방지 (T-10.16)
  const mutatingRef = useRef(false);

  const patchBook = async (
    body: Record<string, unknown>,
    options?: { optimistic?: Partial<Book>; rollback?: Partial<Book>; successMsg?: string }
  ) => {
    if (mutatingRef.current) return;
    mutatingRef.current = true;

    if (options?.optimistic) {
      setBook((b) => ({ ...b, ...options.optimistic }));
    }

    try {
      const res = await fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setBook(mapBookFromDB(updated));
      if (options?.successMsg) toast.success(options.successMsg);
    } catch {
      if (options?.rollback) {
        setBook((b) => ({ ...b, ...options.rollback }));
      }
      toast.error("변경에 실패했습니다");
    } finally {
      mutatingRef.current = false;
    }
  };

  const handleStatusChange = async (status: BookStatus) => {
    const prev = book.status;
    await patchBook(
      { status },
      { optimistic: { status }, rollback: { status: prev }, successMsg: "상태가 변경되었습니다" }
    );
  };

  const handleRatingChange = async (rating: number | null) => {
    const prev = book.rating;
    await patchBook({ rating }, { optimistic: { rating }, rollback: { rating: prev } });
  };

  const handleCurrentPageSave = async (currentPage: number) => {
    const prev = book.currentPage;
    await patchBook(
      { currentPage },
      { optimistic: { currentPage }, rollback: { currentPage: prev }, successMsg: "진행률이 저장되었습니다" }
    );
  };

  const handleEditSave = async (updates: Record<string, unknown>) => {
    if (mutatingRef.current) return;
    mutatingRef.current = true;

    try {
      const res = await fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setBook(mapBookFromDB(updated));
      setIsEditing(false);
      toast.success("책 정보가 수정되었습니다");
    } catch {
      toast.error("수정에 실패했습니다");
    } finally {
      mutatingRef.current = false;
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/books/${book.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("책이 삭제되었습니다");
      router.push("/");
    } catch {
      toast.error("삭제에 실패했습니다");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 상단 네비게이션 */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          뒤로
        </Button>
        {!isEditing && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="mr-1 h-4 w-4" />
              수정
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive">
                  <Trash2 className="mr-1 h-4 w-4" />
                  삭제
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>책 삭제</AlertDialogTitle>
                  <AlertDialogDescription>
                    &apos;{book.title}&apos;을(를) 삭제하시겠습니까? 관련 메모도
                    함께 삭제됩니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    삭제
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {isEditing ? (
        /* 편집 모드 */
        <BookEditForm
          book={book}
          onSave={handleEditSave}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <>
          {/* 책 정보 */}
          <div className="flex flex-col gap-4 sm:flex-row">
            {/* 표지 */}
            <div className="relative h-48 w-32 shrink-0 self-center overflow-hidden rounded-lg bg-muted sm:self-start">
              {book.coverUrl ? (
                <Image
                  src={book.coverUrl}
                  alt={book.title}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl">
                  📚
                </div>
              )}
            </div>

            {/* 상세 정보 */}
            <div className="flex flex-1 flex-col gap-2">
              <h1 className="text-xl font-bold">{book.title}</h1>
              {book.author && (
                <p className="text-muted-foreground">{book.author}</p>
              )}
              {book.categories.length > 0 && (
                <div className="mt-1">
                  <CategoryBadge categories={book.categories} />
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                {[
                  book.publisher,
                  book.publishedYear && `${book.publishedYear}년`,
                  book.pageCount && `${book.pageCount}p`,
                ]
                  .filter(Boolean)
                  .join(" | ")}
              </p>
              {book.isbn && (
                <p className="text-xs text-muted-foreground">
                  ISBN: {book.isbn}
                </p>
              )}

              <div className="mt-2 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">상태:</span>
                  <StatusSelect
                    value={book.status}
                    onChange={handleStatusChange}
                    disabled={mutatingRef.current}
                  />
                </div>

                {book.startedAt && (
                  <p className="text-sm text-muted-foreground">
                    시작일: {formatDate(book.startedAt)}
                  </p>
                )}
                {book.finishedAt && (
                  <p className="text-sm text-muted-foreground">
                    완료일: {formatDate(book.finishedAt)}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">별점:</span>
                  <StarRating
                    value={book.rating}
                    onChange={handleRatingChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 읽기 진행률 - READING 상태에서만 */}
          {book.status === "READING" && (
            <ReadingProgress
              currentPage={book.currentPage}
              pageCount={book.pageCount}
              onSave={handleCurrentPageSave}
            />
          )}

          {/* 요약 */}
          {book.summary && (
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-semibold">요약</h3>
              <p className="text-sm text-muted-foreground">{book.summary}</p>
            </div>
          )}
        </>
      )}

      {/* 메모 */}
      <div className="border-t pt-4">
        <NoteList bookId={book.id} />
      </div>
    </div>
  );
}
