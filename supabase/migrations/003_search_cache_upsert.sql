-- search_cache: UPSERT 지원 + source 제약 정정
-- 1) 기존 중복 쿼리 정리 (최신 created_at 한 건만 유지)
-- 2) query 컬럼에 UNIQUE 제약 추가 → ON CONFLICT 타겟으로 사용
-- 3) source CHECK 제약을 'gemini'로 정정 (코드는 계속 'gemini'를 전달해왔음)

-- 1. 중복 정리: 동일 query에서 created_at이 최신인 행만 남기고 삭제
DELETE FROM search_cache a
USING search_cache b
WHERE a.query = b.query
  AND a.created_at < b.created_at;

-- 같은 created_at 동률인 경우를 대비해 id 기준 2차 정리
DELETE FROM search_cache a
USING search_cache b
WHERE a.query = b.query
  AND a.created_at = b.created_at
  AND a.id < b.id;

-- 2. UNIQUE 제약 추가
ALTER TABLE search_cache
  ADD CONSTRAINT search_cache_query_unique UNIQUE (query);

-- 3. source CHECK 제약 정정 (기존 'llm' → 'gemini')
ALTER TABLE search_cache
  DROP CONSTRAINT IF EXISTS search_cache_source_check;

ALTER TABLE search_cache
  ADD CONSTRAINT search_cache_source_check
  CHECK (source IN ('gemini', 'google_books'));
