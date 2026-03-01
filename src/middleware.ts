import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  try {
    const { updateSession } = await import("@/lib/supabase/middleware");
    return await updateSession(request);
  } catch {
    // 미들웨어 실패 시 요청을 그대로 통과시킴
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // API 라우트, 정적 파일, 이미지 등은 제외
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
