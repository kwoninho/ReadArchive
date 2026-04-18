"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { isOptimizable } from "@/lib/image";
import type { SearchCandidate } from "@/types";

interface SearchResultCardProps {
  candidate: SearchCandidate;
  onAdd: (candidate: SearchCandidate) => void;
  isAdding: boolean;
}

export function SearchResultCard({
  candidate,
  onAdd,
  isAdding,
}: SearchResultCardProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = candidate.coverUrl && !imgError;

  return (
    <div className="flex gap-3 rounded-lg border p-3">
      {/* 표지 이미지 */}
      <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded bg-muted">
        {showImage ? (
          <Image
            src={candidate.coverUrl!}
            alt={candidate.title}
            fill
            className="object-cover"
            sizes="56px"
            unoptimized={!isOptimizable(candidate.coverUrl)}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            표지 없음
          </div>
        )}
      </div>

      {/* 책 정보 */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <p className="font-medium leading-tight">{candidate.title}</p>
          <p className="text-sm text-muted-foreground">
            {candidate.author}
            {candidate.publisher && ` | ${candidate.publisher}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {candidate.publishedYear > 0 && `${candidate.publishedYear}년`}
            {candidate.pageCount > 0 && ` | ${candidate.pageCount}p`}
          </p>
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => onAdd(candidate)}
            disabled={isAdding}
          >
            {isAdding ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : null}
            추가
          </Button>
        </div>
      </div>
    </div>
  );
}
