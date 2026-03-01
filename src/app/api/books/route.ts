// 책 목록 조회 / 등록 API
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: 사용자의 책 목록 조회
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");

  let query = supabase
    .from("books")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (status) {
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.title?.trim()) {
    return Response.json(
      { error: "제목은 필수입니다" },
      { status: 400 }
    );
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
      status: body.status || "WANT_TO_READ",
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
