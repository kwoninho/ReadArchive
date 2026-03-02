// OAuth 콜백 처리: code → session 교환
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/";
  // 오픈 리다이렉트 방지: 상대 경로만 허용
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  // request.nextUrl.origin은 서버 바인딩 주소(0.0.0.0)를 반환할 수 있으므로
  // 브라우저가 실제 접속한 host 헤더를 사용
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const protocol = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 에러 발생 시 로그인 페이지로 리다이렉트
  return NextResponse.redirect(`${origin}/login`);
}
