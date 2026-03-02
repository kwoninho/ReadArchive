// 책 목록 조회 / 등록 API
import { NextRequest } from "next/server";
import {
  requireAuth,
  isAuthError,
  safeParseJSON,
  getString,
  isValidBookStatus,
} from "@/lib/api/helpers";

// GET: 사용자의 책 목록 조회
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { supabase, user } = auth;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");

  let query = supabase
    .from("books")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (status) {
    if (!isValidBookStatus(status)) {
      return Response.json({ error: "유효하지 않은 상태값입니다" }, { status: 400 });
    }
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}

// POST: 새 책 등록
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { supabase, user } = auth;

  const body = await safeParseJSON(request);
  if (!body) {
    return Response.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  if (!getString(body, "title")?.trim()) {
    return Response.json({ error: "제목은 필수입니다" }, { status: 400 });
  }

  const status = body.status ?? "WANT_TO_READ";
  if (!isValidBookStatus(status)) {
    return Response.json({ error: "유효하지 않은 상태값입니다" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("books")
    .insert({
      user_id: user.id,
      title: body.title,
      author: body.author || null,
      publisher: body.publisher || null,
      published_year: body.publishedYear || null,
      isbn: body.isbn || null,
      page_count: body.pageCount || null,
      summary: body.summary || null,
      category: body.category || null,
      cover_url: body.coverUrl || null,
      status,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
