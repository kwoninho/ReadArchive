// 책 상세 조회 / 수정 / 삭제 API
import { NextRequest } from "next/server";
import {
  requireAuth,
  isAuthError,
  safeParseJSON,
  isValidBookStatus,
  isValidRating,
} from "@/lib/api/helpers";
import type { RouteParams } from "@/types";

// GET: 책 상세 조회
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("books")
    .select("*")
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

  const { data, error } = await supabase
    .from("books")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
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
