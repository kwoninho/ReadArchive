// 책 목록 조회 / 등록 API
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  requireAuth,
  isAuthError,
  safeParseJSON,
  getString,
  getStringArray,
  isValidBookStatus,
} from "@/lib/api/helpers";
import { BOOK_WITH_CATEGORIES_SELECT } from "@/lib/books";

// GET: 사용자의 책 목록 조회
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { supabase, user } = auth;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");

  let query = supabase
    .from("books")
    .select(BOOK_WITH_CATEGORIES_SELECT)
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

  const categoryIds = parseCategoryIds(body);
  if (body.categoryIds !== undefined && !categoryIds) {
    return Response.json(
      { error: "categoryIds는 문자열 배열이어야 합니다" },
      { status: 400 }
    );
  }

  const uniqueCategoryIds = [...new Set(categoryIds ?? [])];
  const categoryValidation = await validateCategoryIds(supabase, uniqueCategoryIds);
  if (!categoryValidation.valid) {
    return Response.json(
      { error: "유효하지 않은 categoryIds가 포함되어 있습니다" },
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
      cover_url: body.coverUrl || null,
      status,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (uniqueCategoryIds.length > 0) {
    const { error: relationError } = await supabase
      .from("book_categories")
      .insert(
        uniqueCategoryIds.map((categoryId) => ({
          book_id: data.id,
          category_id: categoryId,
        }))
      );

    if (relationError) {
      await supabase.from("books").delete().eq("id", data.id).eq("user_id", user.id);
      return Response.json({ error: relationError.message }, { status: 500 });
    }
  }

  const { data: created, error: createdError } = await supabase
    .from("books")
    .select(BOOK_WITH_CATEGORIES_SELECT)
    .eq("id", data.id)
    .eq("user_id", user.id)
    .single();

  if (createdError) {
    return Response.json({ error: createdError.message }, { status: 500 });
  }

  return Response.json(created, { status: 201 });
}

function parseCategoryIds(body: Record<string, unknown>): string[] | undefined {
  return getStringArray(body, "categoryIds");
}

async function validateCategoryIds(
  supabase: SupabaseClient,
  categoryIds: string[]
) {
  if (categoryIds.length === 0) {
    return { valid: true };
  }

  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .in("id", categoryIds);

  if (error) {
    return { valid: false };
  }

  return { valid: (data ?? []).length === categoryIds.length };
}
