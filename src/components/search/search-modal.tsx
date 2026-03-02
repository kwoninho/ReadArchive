"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchResultCard } from "./search-result-card";
import { ManualInputForm } from "./manual-input-form";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import type { SearchCandidate, SearchResponse } from "@/types";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookAdded: (book: Record<string, unknown>) => void;
}

export function SearchModal({
  open,
  onOpenChange,
  onBookAdded,
}: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSearching) return;

    setIsSearching(true);
    setHasSearched(true);
    setResults([]);
    setShowManualInput(false);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "검색에 실패했습니다");
      }

      const data: SearchResponse = await res.json();
      setResults(data.candidates);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "검색에 실패했습니다"
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdd = async (candidate: SearchCandidate, index: number) => {
    setAddingIndex(index);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: candidate.title,
          author: candidate.author,
          publisher: candidate.publisher,
          publishedYear: candidate.publishedYear,
          isbn: candidate.isbn,
          pageCount: candidate.pageCount,
          summary: candidate.summary,
          category: candidate.category,
          coverUrl: candidate.coverUrl,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "등록에 실패했습니다");
      }

      const created = await res.json();
      toast.success(`'${candidate.title}'이(가) 추가되었습니다`);
      onBookAdded(created);
      handleClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "등록에 실패했습니다"
      );
    } finally {
      setAddingIndex(null);
    }
  };

  const handleManualSubmit = async (data: {
    title: string;
    author: string;
    publisher: string;
    summary: string;
  }) => {
    setIsManualSubmitting(true);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "등록에 실패했습니다");
      }

      const created = await res.json();
      toast.success(`'${data.title}'이(가) 추가되었습니다`);
      onBookAdded(created);
      handleClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "등록에 실패했습니다"
      );
    } finally {
      setIsManualSubmitting(false);
    }
  };

  const handleClose = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setShowManualInput(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>책 검색</DialogTitle>
          <DialogDescription>
            제목으로 검색하면 AI가 책 정보를 찾아줍니다.
          </DialogDescription>
        </DialogHeader>

        {/* 검색 폼 */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="책 제목을 입력하세요..."
            disabled={isSearching}
          />
          <Button type="submit" disabled={!query.trim() || isSearching}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* 검색 결과 */}
        {isSearching && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isSearching && results.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              검색 결과: {results.length}건
            </p>
            <div className="max-h-[400px] overflow-y-auto flex flex-col gap-2">
              {results.map((candidate, index) => (
                <SearchResultCard
                  key={`${candidate.isbn}-${index}`}
                  candidate={candidate}
                  onAdd={(c) => handleAdd(c, index)}
                  isAdding={addingIndex === index}
                />
              ))}
            </div>
          </div>
        )}

        {!isSearching && hasSearched && results.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            검색 결과가 없습니다.
          </p>
        )}

        {/* 수동 입력 링크 / 폼 */}
        {hasSearched && !isSearching && (
          <div className="border-t pt-3">
            {!showManualInput ? (
              <button
                onClick={() => setShowManualInput(true)}
                className="text-sm text-muted-foreground underline hover:text-foreground"
              >
                찾는 책이 없나요? 직접 입력하기
              </button>
            ) : (
              <ManualInputForm
                onSubmit={handleManualSubmit}
                isSubmitting={isManualSubmitting}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
