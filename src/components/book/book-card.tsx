"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Book } from "@/types";

interface BookCardProps {
  book: Book;
}

// 읽기 전용 별점 표시
function StarRatingDisplay({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <span className="text-xs">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? "text-yellow-500" : "text-muted-foreground/30"}>
          ★
        </span>
      ))}
    </span>
  );
}

export function BookCard({ book }: BookCardProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = book.coverUrl && !imgError;

  return (
    <Link
      href={`/books/${book.id}`}
      className="flex gap-3 rounded-lg border bg-card p-3 shadow-sm transition-colors hover:bg-accent/50"
    >
      {/* 표지 */}
      <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-muted">
        {showImage ? (
          <Image
            src={book.coverUrl!}
            alt={book.title}
            fill
            className="object-cover"
            sizes="44px"
            unoptimized
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[8px] text-muted-foreground">
            📚
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="truncate text-sm font-medium">{book.title}</p>
        {book.author && (
          <p className="truncate text-xs text-muted-foreground">{book.author}</p>
        )}
        {/* 상태별 추가 정보 */}
        {book.status === "READING" && book.startedAt && (
          <p className="text-xs text-muted-foreground">
            시작: {new Date(book.startedAt).toLocaleDateString("ko-KR")}
          </p>
        )}
        {book.status === "FINISHED" && <StarRatingDisplay rating={book.rating} />}
      </div>
    </Link>
  );
}
