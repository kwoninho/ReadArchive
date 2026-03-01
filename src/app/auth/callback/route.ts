// OAuth 콜백 처리
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return Response.json({ message: "not implemented" }, { status: 501 });
}
