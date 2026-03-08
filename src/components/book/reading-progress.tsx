"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ReadingProgressProps {
  currentPage: number | null;
  pageCount: number | null;
  onSave: (currentPage: number) => Promise<void>;
}

export function ReadingProgress({
  currentPage,
  pageCount,
  onSave,
}: ReadingProgressProps) {
  const [inputValue, setInputValue] = useState(
    currentPage !== null ? String(currentPage) : ""
  );
  const [isSaving, setIsSaving] = useState(false);

  const percentage =
    pageCount && currentPage !== null
      ? Math.min(Math.round((currentPage / pageCount) * 100), 100)
      : null;

  const handleSave = async () => {
    const parsed = parseInt(inputValue, 10);
    if (isNaN(parsed) || parsed < 0) return;
    if (pageCount !== null && parsed > pageCount) return;

    setIsSaving(true);
    try {
      await onSave(parsed);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    }
  };

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 font-semibold">독서 진행률</h3>

      {pageCount ? (
        <>
          {/* 프로그레스 바 */}
          <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${percentage ?? 0}%` }}
            />
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            {currentPage ?? 0} / {pageCount}p ({percentage ?? 0}%)
          </p>
        </>
      ) : (
        <p className="mb-3 text-sm text-muted-foreground">
          전체 페이지 수가 등록되지 않아 진행률을 계산할 수 없습니다.
          {currentPage !== null && ` 현재 ${currentPage}p 읽는 중`}
        </p>
      )}

      {/* 페이지 입력 */}
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          max={pageCount ?? undefined}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="현재 페이지"
          className="w-28"
          disabled={isSaving}
        />
        {pageCount && <span className="text-sm text-muted-foreground">/ {pageCount}p</span>}
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          저장
        </Button>
      </div>
    </div>
  );
}
