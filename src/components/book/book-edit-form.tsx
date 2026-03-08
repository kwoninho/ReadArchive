"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import type { Book, Category } from "@/types";

interface BookEditFormProps {
  book: Book;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export function BookEditForm({ book, onSave, onCancel }: BookEditFormProps) {
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author ?? "");
  const [publisher, setPublisher] = useState(book.publisher ?? "");
  const [publishedYear, setPublishedYear] = useState(
    book.publishedYear !== null ? String(book.publishedYear) : ""
  );
  const [isbn, setIsbn] = useState(book.isbn ?? "");
  const [pageCount, setPageCount] = useState(
    book.pageCount !== null ? String(book.pageCount) : ""
  );
  const [summary, setSummary] = useState(book.summary ?? "");
  const [coverUrl, setCoverUrl] = useState(book.coverUrl ?? "");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(
    new Set(book.categories.map((c) => c.id))
  );
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Category[]) => setAllCategories(data))
      .catch(() => {});
  }, []);

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setIsSaving(true);

    const updates: Record<string, unknown> = {};

    // 항상 모든 편집 가능 필드를 전송 (빈 값 → null로 정규화는 API에서 처리)
    updates.title = title.trim();
    updates.author = author;
    updates.publisher = publisher;
    updates.isbn = isbn;
    updates.summary = summary;
    updates.coverUrl = coverUrl;
    updates.publishedYear = publishedYear ? parseInt(publishedYear, 10) : null;
    updates.pageCount = pageCount ? parseInt(pageCount, 10) : null;
    updates.categoryIds = [...selectedCategoryIds];

    try {
      await onSave(updates);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="edit-cover-url">표지 URL</Label>
          <Input
            id="edit-cover-url"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="edit-title">
            제목 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-author">저자</Label>
            <Input
              id="edit-author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-publisher">출판사</Label>
            <Input
              id="edit-publisher"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-year">출판년도</Label>
            <Input
              id="edit-year"
              type="number"
              value={publishedYear}
              onChange={(e) => setPublishedYear(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-pages">페이지 수</Label>
            <Input
              id="edit-pages"
              type="number"
              value={pageCount}
              onChange={(e) => setPageCount(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-isbn">ISBN</Label>
            <Input
              id="edit-isbn"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="edit-summary">요약</Label>
          <Textarea
            id="edit-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
          />
        </div>

        {allCategories.length > 0 && (
          <div className="grid gap-2">
            <Label>카테고리</Label>
            <div className="flex flex-wrap gap-2">
              {allCategories.map((cat) => (
                <Badge
                  key={cat.id}
                  variant={
                    selectedCategoryIds.has(cat.id) ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => toggleCategory(cat.id)}
                >
                  {cat.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          취소
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!title.trim() || isSaving}
        >
          저장
        </Button>
      </div>
    </div>
  );
}
