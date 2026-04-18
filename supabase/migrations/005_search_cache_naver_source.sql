-- search_cache.source CHECK 제약에 'naver' 값 추가
-- 네이버 책 검색 API 통합 지원. CHECK 확장은 기존 행과 충돌하지 않으므로
-- 단순 DROP → ADD 패턴으로 충분 (마이그레이션 003과 달리 UPDATE 불필요).

BEGIN;

ALTER TABLE search_cache
  DROP CONSTRAINT IF EXISTS search_cache_source_check;

ALTER TABLE search_cache
  ADD CONSTRAINT search_cache_source_check
  CHECK (source IN ('gemini', 'google_books', 'naver'));

COMMIT;
