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

/** BookStatus 유효성 검증 */
export function isValidBookStatus(value: unknown): value is BookStatus {
  return typeof value === "string" && (BOOK_STATUSES as readonly string[]).includes(value);
}

/** rating 유효성 검증 (1~5 정수 또는 null) */
export function isValidRating(value: unknown): value is number | null {
  if (value === null) return true;
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}
