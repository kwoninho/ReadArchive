-- search_cache: UPSERT 지원 + source 제약 정정
-- 무중단 배포를 위해 트랜잭션으로 묶고, 방어적 UPDATE를 선행한다.
-- 1) 기존 'llm' 행을 'gemini'로 마이그레이트 (신규 CHECK 통과 보장)
-- 2) 기존 중복 쿼리 정리 (최신 created_at 한 건만 유지)
-- 3) query 컬럼에 UNIQUE 제약 추가 → ON CONFLICT 타겟으로 사용
-- 4) source CHECK 제약을 'gemini'로 정정

BEGIN;

-- 1. 과거 'llm' 라벨 행을 현재 코드 라벨 'gemini'로 정규화 (해당 행 없으면 no-op)
UPDATE search_cache SET source = 'gemini' WHERE source = 'llm';

-- 2. 중복 정리: 동일 query에서 created_at이 최신인 행만 남기고 삭제
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

-- 3. UNIQUE 제약 추가 (이미 존재하면 스킵)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'search_cache_query_unique'
      AND conrelid = 'search_cache'::regclass
  ) THEN
    ALTER TABLE search_cache
      ADD CONSTRAINT search_cache_query_unique UNIQUE (query);
  END IF;
END$$;

-- 4. source CHECK 제약 정정 ('llm' → 'gemini')
ALTER TABLE search_cache
  DROP CONSTRAINT IF EXISTS search_cache_source_check;

ALTER TABLE search_cache
  ADD CONSTRAINT search_cache_source_check
  CHECK (source IN ('gemini', 'google_books'));

COMMIT;
