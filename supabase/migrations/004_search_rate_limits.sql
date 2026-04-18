-- 검색 API 레이트리미터를 서버 인스턴스 공유 가능한 DB 기반으로 이전
-- 기존 in-memory Map은 serverless 인스턴스 수에 비례해 실제 제한이 느슨해짐
-- 무중단 배포를 위해 idempotent하게 작성

CREATE TABLE IF NOT EXISTS search_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  count INTEGER NOT NULL DEFAULT 0
);

-- RLS: service role만 읽고 쓰기 (사용자 직접 접근 금지)
ALTER TABLE search_rate_limits ENABLE ROW LEVEL SECURITY;
-- 정책 미정의 → service role 외에는 접근 불가 (service role은 RLS 우회)

-- 원자적 check-and-increment 함수
-- 반환값: 허용 시 TRUE, 초과 시 FALSE
CREATE OR REPLACE FUNCTION check_search_rate_limit(
  p_user_id UUID,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_count INTEGER;
BEGIN
  INSERT INTO search_rate_limits (user_id, window_start, count)
  VALUES (p_user_id, v_now, 1)
  ON CONFLICT (user_id) DO UPDATE
  SET
    window_start = CASE
      WHEN search_rate_limits.window_start + (p_window_seconds || ' seconds')::INTERVAL < v_now
        THEN v_now
      ELSE search_rate_limits.window_start
    END,
    count = CASE
      WHEN search_rate_limits.window_start + (p_window_seconds || ' seconds')::INTERVAL < v_now
        THEN 1
      ELSE search_rate_limits.count + 1
    END
  RETURNING count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- service role 외에는 함수 호출 불가 (anon/authenticated 회수)
REVOKE ALL ON FUNCTION check_search_rate_limit(UUID, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION check_search_rate_limit(UUID, INTEGER, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION check_search_rate_limit(UUID, INTEGER, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION check_search_rate_limit(UUID, INTEGER, INTEGER) TO service_role;
