-- 도서 카테고리 분리 마이그레이션

CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS book_categories (
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (book_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_book_categories_book_id
  ON book_categories(book_id);

CREATE INDEX IF NOT EXISTS idx_book_categories_category_id
  ON book_categories(category_id);

INSERT INTO categories (name) VALUES
  ('소설'), ('시/에세이'), ('인문'), ('사회'), ('역사'),
  ('과학'), ('기술/공학'), ('프로그래밍'), ('경영/경제'), ('자기계발'),
  ('예술'), ('종교'), ('여행'), ('요리'), ('건강'),
  ('어린이/청소년'), ('만화'), ('잡지'), ('기타')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Authenticated users can view categories"
    ON categories FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can view own book_categories"
    ON book_categories FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM books
        WHERE books.id = book_categories.book_id
          AND books.user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can insert own book_categories"
    ON book_categories FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM books
        WHERE books.id = book_categories.book_id
          AND books.user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can delete own book_categories"
    ON book_categories FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM books
        WHERE books.id = book_categories.book_id
          AND books.user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

WITH normalized_books AS (
  SELECT
    id,
    CASE
      WHEN category IS NULL OR btrim(category) = '' THEN NULL
      WHEN btrim(category) IN (
        '소설', '시/에세이', '인문', '사회', '역사',
        '과학', '기술/공학', '프로그래밍', '경영/경제', '자기계발',
        '예술', '종교', '여행', '요리', '건강',
        '어린이/청소년', '만화', '잡지', '기타'
      ) THEN btrim(category)
      WHEN lower(category) LIKE '%computer%'
        OR lower(category) LIKE '%program%'
        OR lower(category) LIKE '%software%'
        OR lower(category) LIKE '%web%' THEN '프로그래밍'
      WHEN lower(category) LIKE '%technology%'
        OR lower(category) LIKE '%engineering%' THEN '기술/공학'
      WHEN lower(category) LIKE '%business%'
        OR lower(category) LIKE '%econom%' THEN '경영/경제'
      WHEN lower(category) LIKE '%science%' THEN '과학'
      WHEN lower(category) LIKE '%history%' THEN '역사'
      WHEN lower(category) LIKE '%travel%' THEN '여행'
      WHEN lower(category) LIKE '%cook%' THEN '요리'
      WHEN lower(category) LIKE '%health%' THEN '건강'
      WHEN lower(category) LIKE '%self-help%' THEN '자기계발'
      WHEN lower(category) LIKE '%religion%' THEN '종교'
      WHEN lower(category) LIKE '%comic%' THEN '만화'
      WHEN lower(category) LIKE '%magazine%' THEN '잡지'
      WHEN lower(category) LIKE '%fiction%'
        OR lower(category) LIKE '%novel%' THEN '소설'
      ELSE '기타'
    END AS normalized_category
  FROM books
)
INSERT INTO book_categories (book_id, category_id)
SELECT nb.id, c.id
FROM normalized_books nb
JOIN categories c ON c.name = nb.normalized_category
WHERE nb.normalized_category IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE books DROP COLUMN IF EXISTS category;
