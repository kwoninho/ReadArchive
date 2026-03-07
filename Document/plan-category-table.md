# Plan: 도서 카테고리 별도 테이블 분리

> **작성일**: 2026-03-07
> **목표**: `books.category TEXT` 컬럼을 제거하고, 별도 `categories` 테이블 + 조인 테이블로 관리

### 설계 결정 사항

| 항목 | 결정 |
|------|------|
| **관계 모델** | N:M (한 권에 여러 카테고리 가능) |
| **카테고리 관리** | 시스템 글로벌 사전 정의 (user_id 없음, 시드 데이터로 관리) |
| **이번 범위** | 테이블 분리 + API + SSR 조회 경로 + store 매핑 (카테고리 UI는 별도 작업) |

---

## 1. 현재 구조 (AS-IS)

- `books` 테이블에 `category TEXT` 컬럼으로 단일 문자열 저장
- 검색 결과(`SearchCandidate`)에서 카테고리 문자열을 그대로 전달
- `Book` 타입에 `category: string | null` 필드 존재
- UI에서 카테고리를 별도로 표시하는 컴포넌트는 없음 (book-detail, book-card에서 미사용)

### 카테고리 관련 파일 목록

| 파일 | 역할 |
|------|------|
| `supabase/schema.sql` | `books.category TEXT` 컬럼 정의 |
| `src/types/index.ts` | `Book.category`, `SearchCandidate.category` 타입 |
| `src/stores/book-store.ts` | `mapBookFromDB`에서 `row.category` 매핑 |
| `src/app/api/books/route.ts` | POST에서 `category` insert |
| `src/app/page.tsx` | 메인 목록 SSR에서 `books` 직접 조회 |
| `src/app/books/[id]/page.tsx` | 상세 페이지 SSR에서 `books` 직접 조회 |
| `src/components/board/kanban-board.tsx` | SSR raw row를 `mapBookFromDB`로 변환 |
| `src/components/search/search-modal.tsx` | 검색 결과 → 등록 시 `category` 전달 |
| `src/lib/search/google-books-search.ts` | Google Books API `categories[0]` 매핑 |
| `src/lib/search/llm-search.ts` | LLM 프롬프트에 `category` 필드 포함 |
| `src/lib/search/__tests__/*` | 테스트 픽스처에 `category` 포함 |
| `src/stores/__tests__/book-store.test.ts` | 테스트 픽스처에 `category` 포함 |
| `src/components/search/__tests__/search-result-card.test.tsx` | 테스트 픽스처에 `category` 포함 |

---

## 2. 목표 구조 (TO-BE)

### 2.1 DB 설계

```sql
-- 카테고리 마스터 테이블 (시스템 글로벌, user_id 없음)
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 도서-카테고리 연결 테이블 (N:M)
CREATE TABLE book_categories (
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (book_id, category_id)
);

-- 시드 데이터 (사전 정의 카테고리)
INSERT INTO categories (name) VALUES
  ('소설'), ('시/에세이'), ('인문'), ('사회'), ('역사'),
  ('과학'), ('기술/공학'), ('프로그래밍'), ('경영/경제'), ('자기계발'),
  ('예술'), ('종교'), ('여행'), ('요리'), ('건강'),
  ('어린이/청소년'), ('만화'), ('잡지'), ('기타');
```

### 2.3 카테고리 매칭 전략

- 검색 결과(`SearchCandidate.category`)는 외부 소스 문자열을 유지
- 등록 시점에만 사전 정의 카테고리로 정규화하여 `categoryIds`로 변환
- 영문/한글 또는 표현 차이를 흡수하기 위해 별도 매핑 규칙 사용
  - 예: `Computers` → `프로그래밍` 또는 `기술/공학`
- 매칭 실패 시 정책을 명시적으로 적용
  - 권장: `기타`로 폴백
  - 대안: 미연결 허용

### 2.2 RLS 정책

```sql
-- categories RLS (모든 인증 사용자 읽기 가능, 수정 불가)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view categories"
  ON categories FOR SELECT USING (auth.role() = 'authenticated');

-- book_categories RLS (book 소유자 기준)
ALTER TABLE book_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own book_categories" ON book_categories FOR SELECT
  USING (EXISTS (SELECT 1 FROM books WHERE books.id = book_id AND books.user_id = auth.uid()));
CREATE POLICY "Users can insert own book_categories" ON book_categories FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM books WHERE books.id = book_id AND books.user_id = auth.uid()));
CREATE POLICY "Users can delete own book_categories" ON book_categories FOR DELETE
  USING (EXISTS (SELECT 1 FROM books WHERE books.id = book_id AND books.user_id = auth.uid()));
```

---

## 3. 구현 단계

### Step 1: DB 스키마 변경

- [ ] `supabase/schema.sql`에 `categories`, `book_categories` 테이블 및 시드 데이터 추가
- [ ] 인덱스 추가: `idx_book_categories_book_id`, `idx_book_categories_category_id`
- [ ] RLS 정책 추가 (categories: 인증 사용자 읽기 전용, book_categories: 소유자 기준)
- [ ] `books.category TEXT` 컬럼 제거 (schema.sql에서)

### Step 2: 마이그레이션 SQL 작성

- [ ] `supabase/migrations/001_category_table.sql` 작성
  - 새 테이블 생성 + 시드 데이터 삽입
  - 기존 `books.category` 데이터를 정규화/매핑 후 사전 정의 카테고리에 연결
  - 매칭 실패 데이터는 `기타` 폴백 또는 무시 정책 적용
  - `books.category` 컬럼 DROP

```sql
-- 마이그레이션
-- 1. 테이블 생성 + 시드 데이터 (2.1 참조)

-- 2. 기존 데이터 이관 (정규화/매핑 가능한 값만 연결)
INSERT INTO book_categories (book_id, category_id)
SELECT b.id, c.id FROM books b
JOIN categories c ON c.name = b.category
WHERE b.category IS NOT NULL AND b.category != '';

-- 3. 기존 컬럼 제거
ALTER TABLE books DROP COLUMN category;
```

### Step 3: 타입 변경

- [ ] `src/types/index.ts`
  - `Book.category: string | null` → `Book.categories: Category[]`
  - `Category` 인터페이스 추가: `{ id: string; name: string }`
  - `SearchCandidate.category`는 유지 (검색 결과는 여전히 문자열)

### Step 4: API 수정

- [ ] **카테고리 조회 API 추가**: `src/app/api/categories/route.ts`
  - `GET`: 사전 정의 카테고리 목록 조회 (읽기 전용, 사용자가 추가/삭제 불가)

- [ ] **도서 등록 API 수정**: `src/app/api/books/route.ts`
  - POST: `category` 문자열 대신 `categoryIds: string[]`를 받아서 `book_categories`에 연결
  - GET: books 조회 시 `book_categories` + `categories` 조인하여 카테고리 정보 포함

- [ ] **도서 상세 API 수정**: `src/app/api/books/[id]/route.ts`
  - GET 응답에 카테고리 정보 포함
  - PATCH에서 카테고리 업데이트 지원 (`categoryIds` 배열로 교체)

- [ ] **SSR 조회 경로 수정**
  - `src/app/page.tsx`: 메인 목록 조회 시 `book_categories + categories` 조인 포함
  - `src/app/books/[id]/page.tsx`: 상세 조회 시 동일한 조인 구조 적용

### Step 5: Store 수정

- [ ] `src/stores/book-store.ts`
  - `mapBookFromDB`: `row.category` 매핑 제거 → 조인 결과에서 `categories` 배열 매핑

### Step 6: 검색/등록 플로우 수정

- [ ] `src/lib/search/google-books-search.ts`: `SearchCandidate.category` 매핑은 유지 (외부 API 결과)
- [ ] `src/lib/search/llm-search.ts`: `SearchCandidate.category` 매핑은 유지
- [ ] `src/components/search/search-modal.tsx`: 등록 시 `category` 문자열을 정규화/매핑하여 `categoryIds`로 변환 후 API 전달
- [ ] 매칭 실패 처리 규칙 명시: `기타` 폴백 또는 미연결 허용

### Step 7: 테스트 수정

- [ ] `src/stores/__tests__/book-store.test.ts`: 픽스처 및 매핑 테스트 수정 (`category` → `categories[]`)
- [ ] `src/lib/search/__tests__/*.test.ts`: `SearchCandidate` 관련 테스트는 변경 없음
- [ ] `src/components/search/__tests__/search-result-card.test.tsx`: 변경 없음
- [ ] 카테고리 조회 API 테스트 추가
- [ ] 카테고리 정규화/매핑 로직 테스트 추가

---

## 4. 영향 범위 요약

| 영역 | 변경 내용 | 난이도 |
|------|----------|--------|
| DB 스키마 | 테이블 2개 추가, 컬럼 1개 제거, RLS 추가 | 낮음 |
| 마이그레이션 | 기존 데이터 이관 SQL | 낮음 |
| 타입 | `Category` 추가, `Book` 수정 | 낮음 |
| API/SSR | 카테고리 조회 신규, books API 수정, SSR 조회 조인 반영 | 중간 |
| Store | `mapBookFromDB` 수정 | 낮음 |
| 검색 | `SearchCandidate`는 유지, 등록 시 카테고리 정규화/매핑 로직 추가 | 중간 |
| 테스트 | 픽스처 수정 + 카테고리 API/매핑 테스트 추가 | 중간 |

---

## 5. 참고: 후속 작업 (이번 범위 밖)

- 카테고리 UI: 도서 상세 페이지에 카테고리 배지 표시, 카테고리별 필터링
- 카테고리 관리 UI: 시스템 카테고리 목록 표시 (관리자 추가/삭제는 별도 검토)

---

## 6. 작업 관리 메모

- 이 문서를 실제 구현 작업 명세로 사용할 경우, 작업 시작 전 `Document/plan.md`에도 task를 등록하고 승인받아야 함
