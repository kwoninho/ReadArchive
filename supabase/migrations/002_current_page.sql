-- books 테이블에 현재 읽고 있는 페이지 컬럼 추가
ALTER TABLE books ADD COLUMN current_page INTEGER CHECK (current_page >= 0);
