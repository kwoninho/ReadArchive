// 검색 API 레이트리미터 (DB 기반, 서버 인스턴스 공유)
// Postgres 함수 check_search_rate_limit으로 원자적 check+increment 수행
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedSupabase = SupabaseClient<any, "public", any>;

let serviceClient: UntypedSupabase | null = null;

function getServiceClient(): UntypedSupabase {
  if (!serviceClient) {
    serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return serviceClient;
}

// 사용자당 지정 윈도우 내 호출을 제한한다.
// DB RPC 실패 시 fail-open (장애로 기능 전체를 막지 않음) + 로깅.
export async function checkSearchRateLimit(
  userId: string,
  limit = 10,
  windowSeconds = 60
): Promise<boolean> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc("check_search_rate_limit", {
    p_user_id: userId,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("[rate-limit] RPC error (fail-open):", error.message);
    return true;
  }

  return data === true;
}
