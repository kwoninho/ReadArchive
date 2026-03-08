// 책 상세 조회 / 수정 / 삭제 API
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  requireAuth,
  isAuthError,
  safeParseJSON,
  getStringArray,
  isValidBookStatus,
  isValidRating,
  parseBookMetadataFields,
} from "@/lib/api/helpers";
import type { RouteParams } from "@/types";
import { BOOK_WITH_CATEGORIES_SELECT } from "@/lib/books";

// GET: 책 상세 조회
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("books")
    .select(BOOK_WITH_CATEGORIES_SELECT)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    return Response.json({ error: "책을 찾을 수 없습니다" }, { status: 404 });
  }

  return Response.json(data);
}

// PATCH: 책 정보 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { supabase, user } = auth;

  const body = await safeParseJSON(request);
  if (!body) {
    return Response.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  const { data: existingBook, error: existingBookError } = await supabase
    .from("books")
    .select("id, current_page, page_count")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (existingBookError || !existingBook) {
    return Response.json({ error: "책을 찾을 수 없습니다" }, { status: 404 });
  }

  // 업데이트할 필드 구성 (snake_case 변환)
  const updates: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!isValidBookStatus(body.status)) {
      return Response.json({ error: "유효하지 않은 상태값입니다" }, { status: 400 });
    }
    updates.status = body.status;

    // READING으로 변경 시 시작일 자동 설정
    if (body.status === "READING" && body.startedAt === undefined) {
      updates.started_at = new Date().toISOString();
    }
    // FINISHED로 변경 시 완료일 자동 설정
    if (body.status === "FINISHED" && body.finishedAt === undefined) {
      updates.finished_at = new Date().toISOString();
    }
  }

  if (body.rating !== undefined) {
    if (!isValidRating(body.rating)) {
      return Response.json({ error: "별점은 1~5 사이의 정수여야 합니다" }, { status: 400 });
    }
    updates.rating = body.rating;
  }

  if (body.startedAt !== undefined) updates.started_at = body.startedAt;
  if (body.finishedAt !== undefined) updates.finished_at = body.finishedAt;

  // 메타데이터 필드 (T-10.10)
  const metaResult = parseBookMetadataFields(body);
  if ("error" in metaResult) {
    return Response.json({ error: metaResult.error }, { status: metaResult.status });
  }
  Object.assign(updates, metaResult.updates);

  // currentPage 검증 (T-10.06)
  if (body.currentPage !== undefined) {
    if (body.currentPage !== null) {
      if (typeof body.currentPage !== "number" || !Number.isInteger(body.currentPage) || body.currentPage < 0) {
        return Response.json({ error: "현재 페이지는 0 이상의 정수여야 합니다" }, { status: 400 });
      }
      // pageCount 기준: 요청에 포함된 새 값 우선, 없으면 기존 DB 값
      const effectivePageCount = (updates.page_count !== undefined
        ? updates.page_count
        : existingBook.page_count) as number | null;
      if (effectivePageCount !== null && body.currentPage > effectivePageCount) {
        return Response.json(
          { error: `현재 페이지는 전체 페이지(${effectivePageCount}) 이하여야 합니다` },
          { status: 400 }
        );
      }
    }
    updates.current_page = body.currentPage;
  }

  // pageCount 변경 시 currentPage 자동 보정 (T-10.10)
  if (updates.page_count !== undefined && body.currentPage === undefined) {
    const existingCurrentPage = existingBook.current_page as number | null;
    const newPageCount = updates.page_count as number | null;
    if (newPageCount !== null && existingCurrentPage !== null && existingCurrentPage > newPageCount) {
      updates.current_page = newPageCount;
    }
  }

  // FINISHED 전환 시 currentPage 자동 동기화 (T-10.06)
  if (body.status === "FINISHED") {
    const effectivePageCount = (updates.page_count !== undefined
      ? updates.page_count
      : existingBook.page_count) as number | null;
    if (effectivePageCount !== null) {
      updates.current_page = effectivePageCount;
    }
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

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("books")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  if (body.categoryIds !== undefined) {
    // 기존 카테고리 백업 (insert 실패 시 복구용)
    const { data: oldCategories } = await supabase
      .from("book_categories")
      .select("category_id")
      .eq("book_id", id);

    const { error: deleteError } = await supabase
      .from("book_categories")
      .delete()
      .eq("book_id", id);

    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 });
    }

    if (uniqueCategoryIds.length > 0) {
      const { error: insertError } = await supabase
        .from("book_categories")
        .insert(
          uniqueCategoryIds.map((categoryId) => ({
            book_id: id,
            category_id: categoryId,
          }))
        );

      if (insertError) {
        // 복구: 기존 카테고리 재삽입
        if (oldCategories && oldCategories.length > 0) {
          await supabase
            .from("book_categories")
            .insert(oldCategories.map((c) => ({ book_id: id, category_id: c.category_id })));
        }
        return Response.json({ error: insertError.message }, { status: 500 });
      }
    }
  }

  const { data, error } = await supabase
    .from("books")
    .select(BOOK_WITH_CATEGORIES_SELECT)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}

// DELETE: 책 삭제
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("books")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
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
