"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface ManualInputFormProps {
  onSubmit: (data: {
    title: string;
    author: string;
    publisher: string;
    summary: string;
  }) => void;
  isSubmitting: boolean;
}

export function ManualInputForm({
  onSubmit,
  isSubmitting,
}: ManualInputFormProps) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [publisher, setPublisher] = useState("");
  const [summary, setSummary] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), author, publisher, summary });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <Label htmlFor="manual-title">제목 *</Label>
        <Input
          id="manual-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="책 제목"
          required
        />
      </div>
      <div>
        <Label htmlFor="manual-author">저자</Label>
        <Input
          id="manual-author"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="저자명"
        />
      </div>
      <div>
        <Label htmlFor="manual-publisher">출판사</Label>
        <Input
          id="manual-publisher"
          value={publisher}
          onChange={(e) => setPublisher(e.target.value)}
          placeholder="출판사"
        />
      </div>
      <div>
        <Label htmlFor="manual-summary">요약</Label>
        <textarea
          id="manual-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="간단한 요약"
          className="flex min-h-[60px] w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <Button type="submit" disabled={!title.trim() || isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
        ) : null}
        등록
      </Button>
    </form>
  );
}
