// 메모 목록 조회 / 추가 API
import { NextRequest } from "next/server";
import { requireAuth, isAuthError, safeParseJSON, getString } from "@/lib/api/helpers";
import type { RouteParams } from "@/types";

// GET: 특정 책의 메모 목록 조회 (최신순)
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id: bookId } = await params;
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("book_id", bookId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}

// POST: 메모 추가
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: bookId } = await params;
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { supabase, user } = auth;

  const body = await safeParseJSON(request);
  if (!body) {
    return Response.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  const content = getString(body, "content")?.trim();
  if (!content) {
    return Response.json(
      { error: "메모 내용을 입력해주세요" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("notes")
    .insert({
      book_id: bookId,
      user_id: user.id,
      content,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
