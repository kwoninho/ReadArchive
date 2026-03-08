// API 라우트 공통 헬퍼
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { BOOK_STATUSES, type BookStatus } from "@/types";

/** 인증 확인 후 supabase 클라이언트와 user 반환. 미인증 시 401 Response 반환 */
export async function requireAuth(): Promise<
  { supabase: SupabaseClient; user: User } | Response
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  return { supabase, user };
}

/** requireAuth 결과가 Response(에러)인지 판별하는 타입 가드 */
export function isAuthError(
  result: { supabase: SupabaseClient; user: User } | Response
): result is Response {
  return result instanceof Response;
}

/** JSON 바디를 안전하게 파싱. 실패 시 null 반환 */
export async function safeParseJSON(
  request: Request
): Promise<Record<string, unknown> | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** Extract a string field from parsed JSON body */
export function getString(
  body: Record<string, unknown>,
  key: string
): string | undefined {
  const val = body[key];
  return typeof val === "string" ? val : undefined;
}

/** Extract a string array field from parsed JSON body */
export function getStringArray(
  body: Record<string, unknown>,
  key: string
): string[] | undefined {
  const val = body[key];
  if (!Array.isArray(val)) return undefined;
  return val.every((item) => typeof item === "string") ? val : undefined;
}

/** BookStatus 유효성 검증 */
export function isValidBookStatus(value: unknown): value is BookStatus {
  return typeof value === "string" && (BOOK_STATUSES as readonly string[]).includes(value);
}

/** rating 유효성 검증 (1~5 정수 또는 null) */
export function isValidRating(value: unknown): value is number | null {
  if (value === null) return true;
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

/** 양의 정수 또는 null 검증 (min 이상) */
export function isValidPositiveInt(value: unknown, min = 1): value is number | null {
  if (value === null) return true;
  return typeof value === "number" && Number.isInteger(value) && value >= min;
}

/** 선택 문자열 정규화: trim 후 빈 문자열이면 null 반환 */
export function normalizeOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** 책 메타데이터 필드 파싱 및 정규화 결과 */
export interface BookFieldUpdates {
  title?: string;
  author?: string | null;
  publisher?: string | null;
  published_year?: number | null;
  isbn?: string | null;
  page_count?: number | null;
  summary?: string | null;
  cover_url?: string | null;
}

/**
 * 책 메타데이터 필드를 파싱하고 검증한다.
 * 에러 시 { error, status } 반환, 성공 시 { updates } 반환.
 */
export function parseBookMetadataFields(
  body: Record<string, unknown>
): { updates: BookFieldUpdates } | { error: string; status: number } {
  const updates: BookFieldUpdates = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim() === "") {
      return { error: "제목은 필수입니다", status: 400 };
    }
    updates.title = body.title.trim();
  }

  if (body.author !== undefined) updates.author = normalizeOptionalString(body.author);
  if (body.publisher !== undefined) updates.publisher = normalizeOptionalString(body.publisher);
  if (body.isbn !== undefined) updates.isbn = normalizeOptionalString(body.isbn);
  if (body.summary !== undefined) updates.summary = normalizeOptionalString(body.summary);
  if (body.coverUrl !== undefined) updates.cover_url = normalizeOptionalString(body.coverUrl);

  if (body.publishedYear !== undefined) {
    if (!isValidPositiveInt(body.publishedYear, 1)) {
      return { error: "출판년도는 1 이상의 정수여야 합니다", status: 400 };
    }
    updates.published_year = body.publishedYear as number | null;
  }

  if (body.pageCount !== undefined) {
    if (!isValidPositiveInt(body.pageCount, 1)) {
      return { error: "페이지 수는 1 이상의 정수여야 합니다", status: 400 };
    }
    updates.page_count = body.pageCount as number | null;
  }

  return { updates };
}
