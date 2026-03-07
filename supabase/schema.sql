-- =============================================
-- ReadArchive DB 스키마
-- =============================================

-- books 테이블
CREATE TABLE books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  publisher TEXT,
  published_year INTEGER,
  isbn TEXT,
  page_count INTEGER,
  summary TEXT,
  cover_url TEXT,
  status TEXT NOT NULL DEFAULT 'WANT_TO_READ'
    CHECK (status IN ('WANT_TO_READ', 'READING', 'FINISHED')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- notes 테이블
CREATE TABLE notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- categories 테이블
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- book_categories 테이블
CREATE TABLE book_categories (
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (book_id, category_id)
);

-- search_cache 테이블
CREATE TABLE search_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  result JSONB NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('llm', 'google_books')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- 인덱스
CREATE INDEX idx_books_user_id ON books(user_id);
CREATE INDEX idx_books_status ON books(user_id, status);
CREATE INDEX idx_notes_book_id ON notes(book_id);
CREATE INDEX idx_book_categories_book_id ON book_categories(book_id);
CREATE INDEX idx_book_categories_category_id ON book_categories(category_id);
CREATE INDEX idx_search_cache_query ON search_cache(query);

-- 카테고리 시드 데이터
INSERT INTO categories (name) VALUES
  ('소설'), ('시/에세이'), ('인문'), ('사회'), ('역사'),
  ('과학'), ('기술/공학'), ('프로그래밍'), ('경영/경제'), ('자기계발'),
  ('예술'), ('종교'), ('여행'), ('요리'), ('건강'),
  ('어린이/청소년'), ('만화'), ('잡지'), ('기타');

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- RLS 정책
-- =============================================

-- books RLS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own books"
  ON books FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own books"
  ON books FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own books"
  ON books FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own books"
  ON books FOR DELETE USING (auth.uid() = user_id);

-- notes RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes"
  ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE USING (auth.uid() = user_id);

-- categories RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view categories"
  ON categories FOR SELECT USING (auth.role() = 'authenticated');

-- book_categories RLS
ALTER TABLE book_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own book_categories"
  ON book_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM books
      WHERE books.id = book_categories.book_id
        AND books.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own book_categories"
  ON book_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM books
      WHERE books.id = book_categories.book_id
        AND books.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete own book_categories"
  ON book_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM books
      WHERE books.id = book_categories.book_id
        AND books.user_id = auth.uid()
    )
  );

-- search_cache RLS
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cache"
  ON search_cache FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service role can insert cache"
  ON search_cache FOR INSERT WITH CHECK (true);
