# Architecture Guide

> AI 에이전트가 코드 수정/분석 시 참고하는 아키텍처 문서.
> 사람용 README는 [README.md](./README.md), 에이전트 행동 규칙은 [AGENTS.md](./AGENTS.md) 참고.

---

## 디렉터리 구조

```
src/
├── app/                                # Next.js App Router (서버 컴포넌트 기본)
│   ├── layout.tsx                      # 루트 레이아웃 (폰트, Toaster)
│   ├── page.tsx                        # 메인 대시보드 (서버 컴포넌트, 초기 데이터 SSR)
│   ├── loading.tsx / error.tsx / not-found.tsx
│   ├── robots.ts / sitemap.ts
│   ├── login/page.tsx                  # OAuth 로그인 (Google, GitHub)
│   ├── books/[id]/page.tsx             # 책 상세 페이지 (서버 컴포넌트)
│   ├── auth/callback/route.ts          # OAuth 코드 → 세션 교환
│   └── api/
│       ├── books/route.ts              # GET (목록), POST (등록)
│       ├── books/[id]/route.ts         # GET, PATCH, DELETE
│       ├── books/[id]/notes/route.ts   # GET (메모 목록), POST (메모 추가)
│       ├── notes/[id]/route.ts         # PATCH (메모 수정), DELETE (메모 삭제)
│       └── search/route.ts             # POST (캐시 → LLM → Google Books)
│
├── components/
│   ├── board/                          # 칸반 보드
│   │   ├── kanban-board.tsx            # 오케스트레이터 (반응형 분기, DnD 핸들링)
│   │   ├── board-column.tsx            # 드롭 가능 칼럼 (useDroppable)
│   │   ├── draggable-card.tsx          # 드래그 가능 카드 래퍼 (useDraggable)
│   │   ├── drag-overlay-card.tsx       # 드래그 미리보기
│   │   └── mobile-board.tsx            # 모바일 탭+버튼 변형
│   ├── book/
│   │   ├── book-card.tsx               # 카드형 책 표시
│   │   ├── book-detail.tsx             # 상세 페이지 클라이언트 컴포넌트
│   │   ├── star-rating.tsx             # 별점 (1~5, 인터랙티브)
│   │   ├── status-select.tsx           # 상태 드롭다운
│   │   ├── note-list.tsx               # 메모 CRUD 목록
│   │   └── note-editor.tsx             # 메모 작성 textarea
│   ├── search/
│   │   ├── search-modal.tsx            # 검색 다이얼로그 (검색 + 수동 입력)
│   │   ├── search-result-card.tsx      # 검색 결과 항목
│   │   └── manual-input-form.tsx       # 수동 입력 폼 (폴백)
│   ├── layout/
│   │   └── header.tsx                  # 상단 네비게이션 (검색바, 프로필, 로그아웃)
│   └── ui/                             # shadcn/ui 컴포넌트 (수정 지양)
│
├── lib/
│   ├── api/
│   │   ├── helpers.ts                  # requireAuth, getString, isValidBookStatus, isValidRating, safeParseJSON
│   │   └── __tests__/helpers.test.ts
│   ├── search/
│   │   ├── llm-search.ts              # OpenAI GPT-4o-mini 검색 (싱글턴, 동적 import)
│   │   ├── google-books-search.ts     # Google Books API 폴백
│   │   ├── cache.ts                   # Supabase search_cache 레이어 (서비스 키, 싱글턴)
│   │   └── __tests__/                 # 각 모듈 단위 테스트
│   ├── supabase/
│   │   ├── client.ts                   # createBrowserClient (클라이언트 컴포넌트용)
│   │   └── server.ts                   # createServerClient (서버 컴포넌트/API 라우트용, 쿠키 관리)
│   └── utils.ts                        # cn() = clsx + tailwind-merge
│
├── stores/
│   ├── book-store.ts                   # Zustand 스토어 + mapBookFromDB
│   └── __tests__/book-store.test.ts
│
├── hooks/
│   └── use-media-query.ts              # 반응형 분기 (min-width: 768px)
│
├── types/
│   └── index.ts                        # Book, Note, SearchCandidate, SearchResponse, BOOK_STATUSES, BookStatus, RouteParams
│
└── test/
    └── setup.tsx                       # Vitest 글로벌 셋업 (next/image, next/link, next/navigation, sonner 목)
```

---

## 데이터 흐름

### 페이지 렌더링

```
브라우저 요청
  → app/page.tsx (서버 컴포넌트)
    → Supabase에서 user 확인 (미인증이면 /login redirect)
    → books 테이블 SELECT (user_id 필터)
    → <KanbanBoard initialBooks={books} /> 로 전달
      → useEffect에서 mapBookFromDB로 변환 후 Zustand에 setBooks
```

### 책 검색 → 추가

```
SearchModal
  → POST /api/search { query }
    → cache.ts: getCachedSearch(query)  [HIT → 반환]
    → llm-search.ts: searchBooksWithLLM(query)  [성공 → 캐시 저장 → 반환]
    → google-books-search.ts: searchBooksWithGoogleBooks(query)  [성공 → 캐시 저장 → 반환]
    → { candidates: [], source: "none" }  [모두 실패]
  → 사용자가 후보 선택 (또는 수동 입력)
  → POST /api/books { title, author, ... }
  → 응답을 onBookAdded(created) → addBook(mapBookFromDB(created)) → Zustand에 추가
```

### 드래그앤드롭 상태 변경

```
KanbanBoard.handleDragEnd
  → moveBook(bookId, newStatus)              # Zustand에 낙관적 업데이트
  → PATCH /api/books/:id { status }          # API 호출
    → [성공] updateBook(bookId, mapped)      # 서버 응답으로 보정
    → [실패] moveBook(bookId, oldStatus)     # 롤백
```

---

## 데이터베이스 스키마

### books

| 칼럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK → auth.users | ON DELETE CASCADE |
| title | TEXT NOT NULL | |
| author, publisher | TEXT | |
| published_year | INTEGER | |
| isbn | TEXT | |
| page_count | INTEGER | |
| summary, category | TEXT | |
| cover_url | TEXT | |
| status | TEXT NOT NULL | `WANT_TO_READ`, `READING`, `FINISHED` |
| rating | INTEGER | 1~5 |
| started_at, finished_at | TIMESTAMPTZ | |
| created_at, updated_at | TIMESTAMPTZ | DEFAULT now() |

### notes

| 칼럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| book_id | UUID FK → books | ON DELETE CASCADE |
| user_id | UUID FK → auth.users | ON DELETE CASCADE |
| content | TEXT NOT NULL | |
| created_at, updated_at | TIMESTAMPTZ | DEFAULT now() |

### search_cache

| 칼럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| query | TEXT NOT NULL | 정규화: trim().toLowerCase() |
| result | JSONB NOT NULL | SearchCandidate[] |
| source | TEXT | `llm`, `google_books` |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| expires_at | TIMESTAMPTZ | 생성 시점 + 30일 |

### RLS 정책

- `books`, `notes`: SELECT/INSERT/UPDATE/DELETE → `user_id = auth.uid()` 필터
- `search_cache`: SELECT → 인증된 사용자 모두, 쓰기 → 서비스 키 전용

### 엔티티 관계

```
auth.users ──1:N──→ books ──1:N──→ notes
                    search_cache (공용 캐시, user 무관)
```

---

## 타입 시스템

### 핵심 타입 (`src/types/index.ts`)

```typescript
const BOOK_STATUSES = ["WANT_TO_READ", "READING", "FINISHED"] as const;
type BookStatus = (typeof BOOK_STATUSES)[number];

interface Book { id, userId, title, author, publisher, publishedYear, isbn, pageCount, summary, category, coverUrl, status, rating, startedAt, finishedAt, createdAt, updatedAt }
interface Note { id, bookId, userId, content, createdAt, updatedAt }
interface SearchCandidate { title, author, publisher, publishedYear, isbn, pageCount, summary, category, coverUrl }
interface SearchResponse { candidates: SearchCandidate[], source: "llm"|"google_books"|"cache"|"none", cached: boolean }
type RouteParams = { params: Promise<{ id: string }> }   // Next.js 동적 라우트
```

### DB ↔ 클라이언트 변환

DB는 `snake_case`, 클라이언트는 `camelCase`. 변환은 `mapBookFromDB()` (`src/stores/book-store.ts`)에서 수행.

```
DB: user_id, cover_url, page_count, published_year, started_at, finished_at, created_at, updated_at
→ Client: userId, coverUrl, pageCount, publishedYear, startedAt, finishedAt, createdAt, updatedAt
```

---

## API 라우트 공통 패턴

모든 API 라우트는 `src/lib/api/helpers.ts`의 헬퍼를 사용:

```typescript
// 인증 확인
const auth = await requireAuth();
if (isAuthError(auth)) return auth;   // 401 자동 반환
const { supabase, user } = auth;

// JSON 바디 파싱
const body = await safeParseJSON(request);
if (!body) return Response.json({ error: "잘못된 요청입니다" }, { status: 400 });

// 문자열 필드 안전 추출 (as string 캐스트 대신)
const title = getString(body, "title")?.trim();

// 유효성 검증
isValidBookStatus(value)   // BookStatus 타입 가드
isValidRating(value)       // 1~5 정수 또는 null 타입 가드
```

---

## 상태 관리 (`src/stores/book-store.ts`)

Zustand 스토어로 클라이언트 상태 관리:

```typescript
interface BookStore {
  books: Book[];
  filterQuery: string;

  setBooks(books): void;
  setFilterQuery(query): void;
  addBook(book): void;
  updateBook(id, updates): void;
  removeBook(id): void;
  moveBook(id, newStatus): void;   // 낙관적 업데이트 + 날짜 자동 설정

  filteredBooks(): Book[];         // filterQuery 기반 파생 상태
  booksByStatus(status): Book[];   // 상태별 필터링 (filteredBooks 기반)
}
```

`moveBook()` 동작:
- `READING`으로 이동 시 `startedAt` 자동 설정 (없을 때만)
- `FINISHED`로 이동 시 `finishedAt` 자동 설정 (없을 때만)

---

## 검색 엔진

### 파이프라인 (`src/app/api/search/route.ts`)

```
1. 캐시 조회 (search_cache, 서비스 키)  → HIT이면 반환
2. LLM 검색 (OpenAI GPT-4o-mini)        → 성공하면 캐시 저장 후 반환
3. Google Books API 폴백                 → 성공하면 캐시 저장 후 반환
4. 빈 결과 반환 (source: "none")
```

### LLM 검색 (`src/lib/search/llm-search.ts`)

- 싱글턴 OpenAI 클라이언트 (동적 import 필수 — 빌드 타임 env 에러 방지)
- `response_format: { type: "json_object" }` 로 구조화된 응답
- 표지 URL: `https://covers.openlibrary.org/b/isbn/{isbn}-M.jpg`

### Google Books 검색 (`src/lib/search/google-books-search.ts`)

- 무료 공개 API (키 불필요)
- `langRestrict=ko` 한국어 우선
- ISBN-13 추출, ISBN-10 폴백

### 캐시 (`src/lib/search/cache.ts`)

- 싱글턴 서비스 클라이언트 (`SUPABASE_SERVICE_ROLE_KEY`, RLS 바이패스)
- 쿼리 정규화: `trim().toLowerCase()`
- 만료: 30일
- 비동기 저장 (실패 무시 — `.catch(() => {})`)

### Rate Limiter

- 인메모리 Map (사용자 ID → { count, resetAt })
- 분당 10회 제한
- 1000개 초과 시 만료 항목 자동 정리

---

## 인증 흐름

```
[/login]
  → supabase.auth.signInWithOAuth({ provider: "google"|"github" })
  → OAuth 제공자 리다이렉트

[/auth/callback?code=xxx&next=/]
  → supabase.auth.exchangeCodeForSession(code)
  → 오픈 리다이렉트 방지: next는 "/" 시작 + "//" 비시작만 허용
  → 세션 쿠키 설정 후 next로 리다이렉트

[/ (메인)]
  → 서버 컴포넌트에서 supabase.auth.getUser()
  → 미인증 → redirect("/login")

[로그아웃]
  → Header에서 supabase.auth.signOut() → router.push("/login")
```

Supabase 클라이언트:
- **서버** (`lib/supabase/server.ts`): `createServerClient` — 쿠키 읽기/쓰기
- **브라우저** (`lib/supabase/client.ts`): `createBrowserClient` — SSR-safe

---

## 반응형 전략

`useMediaQuery("(min-width: 768px)")` 결과로 분기:

| 환경 | 보드 렌더링 | 상태 변경 방식 |
|------|------------|---------------|
| 데스크톱 (768px+) | 3칼럼 DndContext + BoardColumn | 드래그앤드롭 |
| 모바일 (<768px) | MobileBoard (탭 네비게이션) | 버튼 클릭 |

`SearchModal`은 양쪽 모드에서 공유.

---

## 테스트

### 설정

- **프레임워크**: Vitest 4.0 + jsdom + React Testing Library
- **설정 파일**: `vitest.config.ts`
- **셋업**: `src/test/setup.tsx` — next/image, next/link, next/navigation, sonner 목
- **파일 패턴**: `src/**/__tests__/**/*.test.{ts,tsx}`

### 테스트 파일

| 파일 | 대상 | 테스트 수 |
|------|------|----------|
| `lib/api/__tests__/helpers.test.ts` | requireAuth, getString, isValidBookStatus, isValidRating, safeParseJSON | 31 |
| `lib/search/__tests__/llm-search.test.ts` | OpenAI 응답 파싱, 에러 핸들링 | 8 |
| `lib/search/__tests__/google-books-search.test.ts` | Google Books 응답 매핑 | 8 |
| `lib/search/__tests__/cache.test.ts` | 캐시 조회/저장, 만료 | 7 |
| `stores/__tests__/book-store.test.ts` | Zustand 액션, moveBook, 필터링 | 17 |
| `components/book/__tests__/star-rating.test.tsx` | 별점 렌더링, 클릭 | 6 |
| `components/search/__tests__/manual-input-form.test.tsx` | 폼 검증, 제출 | 5 |
| `components/search/__tests__/search-result-card.test.tsx` | 카드 렌더링 | 3 |

### 커버리지 범위

- **포함**: `src/lib/**`, `src/stores/**`, `src/components/**`
- **제외**: `src/components/ui/**` (shadcn/ui 생성 코드)

### 실행

```bash
pnpm test              # 단일 실행 (CI)
pnpm test:watch        # 워치 모드
pnpm test:coverage     # 커버리지 리포트
```

---

## 주요 패턴

### 낙관적 업데이트

드래그앤드롭, 별점 변경 등에서 UI를 먼저 업데이트하고 API를 비동기 호출. 실패 시 롤백.

### 싱글턴 클라이언트

`llm-search.ts`의 OpenAI 클라이언트, `cache.ts`의 서비스 Supabase 클라이언트는 모듈 스코프 변수로 한 번만 생성.

### 동적 Import

`openai` 패키지는 빌드 타임에 환경 변수를 평가하므로 반드시 `await import("openai")` 사용. 지연 초기화만으로는 부족.

### 타입 가드

`isValidBookStatus()`, `isValidRating()`처럼 `value is T` 형태의 타입 가드로 검증과 타입 좁힘을 동시에 처리.

### getString 헬퍼

`safeParseJSON`이 반환하는 `Record<string, unknown>`에서 문자열 필드를 안전하게 추출. `as string` 캐스트 대신 런타임 타입 검사.

---

## 환경 변수

| 변수 | 용도 | 사용 위치 |
|------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | 클라이언트 + 서버 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (RLS 적용) | 클라이언트 + 서버 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 키 (RLS 바이패스) | `lib/search/cache.ts` |
| `OPENAI_API_KEY` | OpenAI API 키 | `lib/search/llm-search.ts` |

---

## Docker 개발 환경

- **Dockerfile**: 멀티스테이지 (deps → dev → builder → runner)
- **docker-compose.yml**: dev 타겟, 소스 볼륨 마운트, `WATCHPACK_POLLING=true`
- **Webpack 모드**: Turbopack 파일 감시 이슈로 `--webpack` 플래그 사용
- 프로덕션 배포는 Vercel (Docker 미사용)

---

## 보안

- API 키는 서버 전용 (클라이언트 노출 없음)
- RLS로 모든 테이블에서 `user_id` 기반 데이터 격리
- `getString()` + 타입 가드로 입력 검증
- Rate Limiter: 사용자당 분당 10회 (인메모리)
- 오픈 리다이렉트 방지: `/auth/callback`에서 상대 경로만 허용
