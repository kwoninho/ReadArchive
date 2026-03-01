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
  category TEXT,
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
CREATE INDEX idx_search_cache_query ON search_cache(query);

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

-- search_cache RLS
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cache"
  ON search_cache FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service role can insert cache"
  ON search_cache FOR INSERT WITH CHECK (true);
