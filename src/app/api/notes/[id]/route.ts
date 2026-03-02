// 메모 수정 / 삭제 API
import { NextRequest } from "next/server";
import { requireAuth, isAuthError, safeParseJSON, getString } from "@/lib/api/helpers";
import type { RouteParams } from "@/types";

// PATCH: 메모 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
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
    .update({ content })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}

// DELETE: 메모 삭제
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
