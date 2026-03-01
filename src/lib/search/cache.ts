// 검색 결과 캐싱 레이어
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SearchCandidate } from "@/types";

// search_cache 테이블은 Supabase DB 타입에 미포함이므로 untyped 클라이언트 사용
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedSupabase = SupabaseClient<any, "public", any>;

// 캐시 조회/저장에는 RLS를 우회하는 service role 클라이언트 사용 (싱글턴)
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

// 검색어 정규화 (캐시 키 생성)
export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

// 캐시에서 검색 결과 조회
export async function getCachedSearch(
  query: string
): Promise<SearchCandidate[] | null> {
  const supabase = getServiceClient();
  const normalized = normalizeQuery(query);

  const { data, error } = await supabase
    .from("search_cache")
    .select("result")
    .eq("query", normalized)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.result as SearchCandidate[];
}

// 검색 결과를 캐시에 저장 (만료: 30일)
export async function setCachedSearch(
  query: string,
  result: SearchCandidate[],
  source: "llm" | "google_books"
): Promise<void> {
  const supabase = getServiceClient();
  const normalized = normalizeQuery(query);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await supabase.from("search_cache").insert({
    query: normalized,
    result,
    source,
    expires_at: expiresAt.toISOString(),
  });
}
