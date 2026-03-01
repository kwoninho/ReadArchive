"use client";

import { useState, useEffect, useCallback } from "react";
import { NoteEditor } from "./note-editor";
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
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface NoteData {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface NoteListProps {
  bookId: string;
}

// 상대 시간 표시
function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR");
}

export function NoteList({ bookId }: NoteListProps) {
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/books/${bookId}/notes`);
      if (res.ok) {
        setNotes(await res.json());
      }
    } catch {
      // 조회 실패 무시
    }
  }, [bookId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleAdd = async (content: string) => {
    const res = await fetch(`/api/books/${bookId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error("메모 추가 실패");
    toast.success("메모가 추가되었습니다");
    fetchNotes();
  };

  const handleEdit = async (noteId: string, content: string) => {
    const res = await fetch(`/api/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error("메모 수정 실패");
    toast.success("메모가 수정되었습니다");
    setEditingId(null);
    fetchNotes();
  };

  const handleDelete = async (noteId: string) => {
    const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("메모 삭제에 실패했습니다");
      return;
    }
    toast.success("메모가 삭제되었습니다");
    fetchNotes();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">내 메모</h3>
      </div>

      {/* 메모 작성 */}
      <NoteEditor onSubmit={handleAdd} />

      {/* 메모 목록 */}
      {notes.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          아직 메모가 없습니다. 첫 메모를 작성해보세요!
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((note) =>
            editingId === note.id ? (
              <NoteEditor
                key={note.id}
                initialContent={note.content}
                onSubmit={(content) => handleEdit(note.id, content)}
                onCancel={() => setEditingId(null)}
                submitLabel="저장"
              />
            ) : (
              <div key={note.id} className="rounded-md border p-3">
                <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(note.created_at)}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setEditingId(note.id)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>메모 삭제</AlertDialogTitle>
                          <AlertDialogDescription>
                            이 메모를 삭제하시겠습니까?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(note.id)}
                          >
                            삭제
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
