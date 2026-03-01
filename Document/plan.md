# ReadArchive - 개발 작업 계획 (Plan)

> **문서 버전**: v1.0
> **작성일**: 2026-03-01
> **기반 문서**: PRD v1.0

---

## 작업 규칙

- 각 Task는 독립적으로 완료 가능한 최소 단위
- Task ID 형식: `T-{Phase}.{순번}` (예: T-1.01)
- 의존성이 있는 Task는 `depends` 필드에 명시
- 체크박스로 완료 여부 추적

---

## Phase 1: 프로젝트 초기 셋업

### T-1.01 Next.js 프로젝트 생성

- [x] 완료
- **설명**: Next.js 14+ App Router 기반 프로젝트를 초기화한다.
- **depends**: 없음
- **작업 내용**:
  1. `pnpm create next-app@latest readarchive --typescript --tailwind --eslint --app --src-dir`
  2. 불필요한 보일러플레이트 코드 정리 (기본 페이지 내용 제거)
  3. `.env.local.example` 파일 생성 (필요한 환경 변수 목록 정리)
     ```
     NEXT_PUBLIC_SUPABASE_URL=
     NEXT_PUBLIC_SUPABASE_ANON_KEY=
     SUPABASE_SERVICE_ROLE_KEY=
     OPENAI_API_KEY=
     ```
  4. `.gitignore`에 `.env.local` 포함 확인
- **산출물**: 실행 가능한 Next.js 프로젝트 (`pnpm dev`로 localhost:3000 확인, Docker 환경은 T-1.07 참고)

### T-1.02 핵심 의존성 설치

- [x] 완료
- **설명**: 프로젝트에 필요한 주요 라이브러리를 설치한다.
- **depends**: T-1.01
- **작업 내용**:
  1. Supabase 클라이언트 설치
     ```bash
     pnpm add @supabase/supabase-js @supabase/ssr
     ```
  2. UI 라이브러리 설치
     ```bash
     pnpm dlx shadcn@latest init
     ```
  3. 드래그앤드롭 라이브러리 설치
     ```bash
     pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
     ```
  4. 상태 관리 설치
     ```bash
     pnpm add zustand
     ```
  5. OpenAI SDK 설치
     ```bash
     pnpm add openai
     ```
  6. 유틸리티 설치
     ```bash
     pnpm add clsx tailwind-merge lucide-react
     ```
- **산출물**: `package.json`에 모든 의존성 반영, `pnpm install` 정상 완료

### T-1.03 프로젝트 디렉토리 구조 설정

- [x] 완료
- **설명**: App Router 기반의 디렉토리 구조를 잡는다.
- **depends**: T-1.02
- **작업 내용**:
  ```
  src/
  ├── app/
  │   ├── layout.tsx            # 루트 레이아웃
  │   ├── page.tsx              # 메인 (칸반 보드)
  │   ├── login/
  │   │   └── page.tsx          # 로그인 페이지
  │   ├── books/
  │   │   └── [id]/
  │   │       └── page.tsx      # 책 상세 페이지
  │   └── api/
  │       ├── search/
  │       │   └── route.ts      # 책 검색 API
  │       ├── books/
  │       │   ├── route.ts      # 책 목록/등록
  │       │   └── [id]/
  │       │       ├── route.ts  # 책 상세/수정/삭제
  │       │       └── notes/
  │       │           └── route.ts  # 메모 목록/추가
  │       └── notes/
  │           └── [id]/
  │               └── route.ts  # 메모 수정/삭제
  ├── components/
  │   ├── ui/                   # shadcn/ui 컴포넌트
  │   ├── layout/               # Header, Footer 등
  │   ├── board/                # 칸반 보드 관련
  │   ├── book/                 # 책 카드, 상세 등
  │   └── search/               # 검색 모달 관련
  ├── lib/
  │   ├── supabase/
  │   │   ├── client.ts         # 브라우저용 Supabase 클라이언트
  │   │   ├── server.ts         # 서버용 Supabase 클라이언트
  │   │   └── middleware.ts     # 인증 미들웨어 헬퍼
  │   ├── openai.ts             # OpenAI 클라이언트
  │   └── utils.ts              # 공용 유틸 함수
  ├── stores/
  │   └── book-store.ts         # Zustand 스토어
  └── types/
      └── index.ts              # TypeScript 타입 정의
  ```
  1. 위 구조에 따라 폴더와 빈 파일(placeholder) 생성
  2. 각 파일에 최소한의 기본 export 작성
- **산출물**: 빌드 에러 없이 구조 완성

### T-1.04 TypeScript 타입 정의

- [x] 완료
- **설명**: PRD의 데이터 모델을 기반으로 TypeScript 타입을 정의한다.
- **depends**: T-1.03
- **작업 내용**:
  ```typescript
  // src/types/index.ts

  export type BookStatus = 'WANT_TO_READ' | 'READING' | 'FINISHED';

  export interface Book {
    id: string;
    userId: string;
    title: string;
    author: string | null;
    publisher: string | null;
    publishedYear: number | null;
    isbn: string | null;
    pageCount: number | null;
    summary: string | null;
    category: string | null;
    coverUrl: string | null;
    status: BookStatus;
    rating: number | null;       // 1~5
    startedAt: string | null;    // ISO 8601
    finishedAt: string | null;   // ISO 8601
    createdAt: string;
    updatedAt: string;
  }

  export interface Note {
    id: string;
    bookId: string;
    userId: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface SearchCandidate {
    title: string;
    author: string;
    publisher: string;
    publishedYear: number;
    isbn: string;
    pageCount: number;
    summary: string;
    category: string;
    coverUrl: string | null;
  }

  export interface SearchResponse {
    candidates: SearchCandidate[];
    source: 'llm' | 'google_books' | 'cache';
    cached: boolean;
  }

  export interface BookCreateInput {
    title: string;
    author?: string;
    publisher?: string;
    publishedYear?: number;
    isbn?: string;
    pageCount?: number;
    summary?: string;
    category?: string;
    coverUrl?: string;
    status?: BookStatus;
  }

  export interface BookUpdateInput {
    status?: BookStatus;
    rating?: number | null;
    startedAt?: string | null;
    finishedAt?: string | null;
  }
  ```
- **산출물**: `src/types/index.ts` 완성, 프로젝트 빌드 확인

### T-1.05 Supabase 프로젝트 설정 및 DB 스키마 생성

- [x] 완료
- **설명**: Supabase 프로젝트를 생성하고 PRD의 데이터 모델에 따라 테이블을 만든다.
- **depends**: T-1.04
- **작업 내용**:
  1. Supabase 대시보드에서 새 프로젝트 생성
  2. SQL Editor에서 다음 스키마 실행:
     ```sql
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
     ```
  3. RLS 정책 설정:
     ```sql
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
     ```
  4. `.env.local`에 Supabase URL, anon key, service role key 입력
- **산출물**: Supabase 테이블 3개 생성 완료, RLS 활성화, 환경 변수 설정

### T-1.06 Supabase 클라이언트 유틸리티 작성

- [x] 완료
- **설명**: 브라우저 및 서버 환경에서 사용할 Supabase 클라이언트를 설정한다.
- **depends**: T-1.05
- **작업 내용**:
  1. `src/lib/supabase/client.ts` - 브라우저용 클라이언트 (createBrowserClient)
  2. `src/lib/supabase/server.ts` - 서버 컴포넌트/API Route용 클라이언트 (createServerClient with cookies)
  3. `src/middleware.ts` - 인증 세션 갱신 미들웨어
- **산출물**: Supabase 클라이언트가 서버/클라이언트 양쪽에서 정상 동작

### T-1.07 Docker 로컬 개발 환경 구성

- [x] 완료
- **설명**: 로컬 개발 환경의 일관성을 위해 Docker 컨테이너 기반 개발 환경을 구성한다.
- **depends**: T-1.01
- **작업 내용**:
  1. **Dockerfile** (멀티스테이지 빌드)
     - `deps` 스테이지: Node.js 20 Alpine 기반, pnpm 설치, 의존성 설치
     - `dev` 스테이지: 개발 서버 타겟 (docker-compose에서 사용)
     - `builder` + `runner` 스테이지: 프로덕션 빌드 (참고용, 프로덕션은 Vercel 사용)
  2. **docker-compose.yml** (개발 환경)
     - 서비스: `app` (target: `dev`)
     - 포트 매핑: `3000:3000`
     - 볼륨 마운트: `src/`, `public/`, 설정 파일들 (node_modules 제외)
     - `env_file: .env.local`
     - `WATCHPACK_POLLING=true` (컨테이너 내 파일 변경 감지)
  3. **.dockerignore**
     - 제외 대상: `node_modules`, `.next`, `.git`, `.env.local` 등
  4. **동작 확인**
     - `docker compose up` → `localhost:3000` 접속 확인
     - 소스 코드 수정 시 핫 리로드 동작 확인
     - 환경 변수 로드 확인 (Supabase 연결 등)
- **산출물**: `docker compose up`으로 개발 서버 실행, 핫 리로드 및 환경 변수 정상 동작

---

## Phase 2: 인증 시스템

### T-2.01 Supabase Auth 소셜 로그인 설정

- [x] 완료
- **설명**: Supabase 대시보드에서 Google, GitHub OAuth 프로바이더를 설정한다.
- **depends**: T-1.06
- **작업 내용**:
  1. Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성
     - 승인된 리다이렉트 URI: `https://<supabase-project>.supabase.co/auth/v1/callback`
  2. GitHub Developer Settings에서 OAuth App 생성
     - Authorization callback URL: `https://<supabase-project>.supabase.co/auth/v1/callback`
  3. Supabase 대시보드 → Authentication → Providers에서 Google, GitHub 활성화
  4. 각 프로바이더의 Client ID, Client Secret 입력
- **산출물**: Supabase Auth에서 Google/GitHub 로그인 가능

### T-2.02 로그인 페이지 UI 구현

- [x] 완료
- **설명**: `/login` 페이지에 소셜 로그인 버튼 UI를 구현한다.
- **depends**: T-2.01
- **작업 내용**:
  1. `src/app/login/page.tsx` 작성
     - 로고 + 서비스명 "ReadArchive"
     - 부제: "나만의 독서 아카이브"
     - Google 로그인 버튼
     - GitHub 로그인 버튼
  2. shadcn/ui Button 컴포넌트 활용
  3. 이미 로그인된 사용자는 `/`로 리다이렉트
- **산출물**: `/login` 페이지 렌더링 확인

### T-2.03 OAuth 로그인/로그아웃 로직 구현

- [x] 완료
- **설명**: 소셜 로그인 실행, 콜백 처리, 로그아웃 로직을 구현한다.
- **depends**: T-2.02
- **작업 내용**:
  1. 로그인 버튼 클릭 시 `supabase.auth.signInWithOAuth()` 호출
  2. `src/app/auth/callback/route.ts` - OAuth 콜백 처리 (code → session 교환)
  3. 로그아웃 기능: `supabase.auth.signOut()` + `/login`으로 리다이렉트
  4. 인증 상태에 따른 라우트 보호 (middleware.ts에서 미인증 시 `/login`으로 리다이렉트)
- **산출물**: Google/GitHub 로그인 → 메인 페이지 이동, 로그아웃 정상 동작

### T-2.04 공통 레이아웃 및 Header 구현

- [x] 완료
- **설명**: 인증된 페이지의 공통 레이아웃과 Header를 구현한다.
- **depends**: T-2.03
- **작업 내용**:
  1. `src/app/layout.tsx` - 루트 레이아웃 (폰트, 메타데이터)
  2. `src/components/layout/header.tsx` - Header 컴포넌트
     - 왼쪽: 로고/서비스명 (클릭 시 `/`로 이동)
     - 중앙: 검색 바 (placeholder, 기능은 T-4.01에서 구현)
     - 오른쪽: 프로필 아바타 + 로그아웃 드롭다운
  3. 로그인 페이지에서는 Header 비노출 처리
- **산출물**: 인증된 페이지에 Header 렌더링, 프로필/로그아웃 동작

---

## Phase 3: 책 검색 및 등록 기능

### T-3.01 OpenAI 클라이언트 및 검색 프롬프트 구현

- [x] 완료
- **설명**: 서버 측에서 OpenAI API를 호출하여 책 정보를 검색하는 로직을 구현한다.
- **depends**: T-1.06
- **작업 내용**:
  1. `src/lib/openai.ts` - OpenAI 클라이언트 생성
  2. `src/lib/search/llm-search.ts` - LLM 기반 책 검색 함수
     - PRD에 정의된 프롬프트 템플릿 사용
     - JSON 응답 파싱 및 유효성 검증
     - 에러 핸들링 (API 실패, 파싱 실패)
  3. 응답에서 ISBN 추출 → Open Library Covers API URL 조합
     - 형식: `https://covers.openlibrary.org/b/isbn/{isbn}-M.jpg`
- **산출물**: LLM 검색 함수가 SearchCandidate[] 반환, 단위 테스트 또는 수동 확인

### T-3.02 Google Books API 폴백 구현

- [x] 완료
- **설명**: LLM API 실패 시 대체할 Google Books API 연동을 구현한다.
- **depends**: T-3.01
- **작업 내용**:
  1. `src/lib/search/google-books-search.ts` - Google Books API 호출 함수
     - 엔드포인트: `https://www.googleapis.com/books/v3/volumes?q={query}`
     - API 키 없이 무료 호출 가능 (일일 1,000건 제한)
     - 응답을 SearchCandidate 형식으로 변환
  2. 표지 이미지: Google Books API 응답의 `imageLinks.thumbnail` 활용
- **산출물**: Google Books 검색 함수가 SearchCandidate[] 반환

### T-3.03 검색 캐싱 레이어 구현

- [x] 완료
- **설명**: 검색 결과를 DB에 캐싱하여 중복 API 호출을 방지한다.
- **depends**: T-3.02, T-1.05
- **작업 내용**:
  1. `src/lib/search/cache.ts` - 캐시 조회/저장 함수
     - 캐시 키: 검색어를 정규화 (trim, 소문자 변환)
     - 조회: `search_cache` 테이블에서 query 일치 + expires_at > now()
     - 저장: 결과를 JSONB로 저장, expires_at = now() + 30일
  2. 만료된 캐시 자동 정리는 MVP에서 미구현 (수동 관리)
- **산출물**: 동일 검색어 두 번째 호출 시 캐시에서 즉시 반환

### T-3.04 통합 검색 API 엔드포인트 구현

- [x] 완료
- **설명**: 캐시 → LLM → Google Books → 수동 입력 순서의 통합 검색 API를 구현한다.
- **depends**: T-3.03
- **작업 내용**:
  1. `src/app/api/search/route.ts` - POST 핸들러
     - 요청 본문: `{ query: string }`
     - 실행 흐름:
       1. 인증 확인
       2. 입력 검증 (빈 문자열, 길이 제한 100자)
       3. 캐시 조회 → 히트 시 즉시 반환
       4. LLM 검색 시도 → 성공 시 캐시 저장 후 반환
       5. Google Books 폴백 → 성공 시 캐시 저장 후 반환
       6. 모두 실패 시 빈 결과 + 수동 입력 안내 응답
     - 응답 형식: `SearchResponse`
  2. Rate limiting: 사용자당 분당 10회 제한 (간단한 in-memory 카운터)
- **산출물**: `POST /api/search` 정상 동작, 폴백 흐름 확인

### T-3.05 책 CRUD API 엔드포인트 구현

- [x] 완료
- **설명**: 책 등록, 조회, 수정, 삭제 API를 구현한다.
- **depends**: T-1.06
- **작업 내용**:
  1. `src/app/api/books/route.ts`
     - GET: 현재 사용자의 책 목록 조회 (쿼리 파라미터 `?status=READING` 필터 지원)
     - POST: 새 책 등록 (BookCreateInput 기반, user_id는 세션에서 추출)
  2. `src/app/api/books/[id]/route.ts`
     - GET: 책 상세 조회
     - PATCH: 책 정보 수정 (상태, 별점, 날짜)
       - 상태 → READING 변경 시 startedAt 자동 설정 (값이 없을 때)
       - 상태 → FINISHED 변경 시 finishedAt 자동 설정 (값이 없을 때)
     - DELETE: 책 삭제 (연관 notes도 CASCADE 삭제)
  3. 모든 엔드포인트에서 인증 확인 + RLS 적용
- **산출물**: Books CRUD API 정상 동작

### T-3.06 책 검색 모달 UI 구현

- [x] 완료
- **설명**: 책 이름을 입력하고 검색 결과에서 선택하여 등록하는 모달 UI를 구현한다.
- **depends**: T-3.04, T-3.05
- **작업 내용**:
  1. `src/components/search/search-modal.tsx` - 검색 모달 컴포넌트
     - shadcn/ui Dialog 기반
     - 검색 입력 필드 + 검색 버튼
     - 로딩 상태: 스피너 표시
     - 검색 결과 목록: 표지, 제목, 저자, 출판사, 연도, 페이지 수
     - 각 후보에 "추가" 버튼
  2. `src/components/search/search-result-card.tsx` - 검색 결과 카드 컴포넌트
  3. `src/components/search/manual-input-form.tsx` - 수동 입력 폼 (폴백)
     - 제목(필수), 저자, 출판사, 요약 필드
  4. "추가" 클릭 시:
     - `POST /api/books` 호출
     - 성공 시 모달 닫기 + 토스트 메시지
     - 칸반 보드 데이터 리페치
- **산출물**: 검색 모달에서 책 검색 → 선택 → 등록까지 전체 플로우 동작

---

## Phase 4: 칸반 보드 (메인 대시보드)

### T-4.01 Zustand 스토어 설정

- [x] 완료
- **설명**: 클라이언트 상태 관리를 위한 Zustand 스토어를 구성한다.
- **depends**: T-1.04
- **작업 내용**:
  1. `src/stores/book-store.ts`
     ```typescript
     interface BookStore {
       books: Book[];
       isLoading: boolean;
       // Actions
       fetchBooks: () => Promise<void>;
       addBook: (book: Book) => void;
       updateBook: (id: string, updates: Partial<Book>) => void;
       removeBook: (id: string) => void;
       moveBook: (id: string, newStatus: BookStatus) => void;
     }
     ```
  2. 낙관적 업데이트 패턴 적용:
     - `moveBook`: 즉시 로컬 상태 변경 → API 호출 → 실패 시 롤백
- **산출물**: Zustand 스토어 구현, 타입 안전성 확인

### T-4.02 칸반 보드 레이아웃 구현

- [x] 완료
- **설명**: 3칼럼 칸반 보드의 기본 레이아웃을 구현한다.
- **depends**: T-4.01, T-3.05
- **작업 내용**:
  1. `src/app/page.tsx` - 메인 페이지
     - 서버 컴포넌트에서 초기 데이터 조회 → 클라이언트 컴포넌트에 전달
  2. `src/components/board/kanban-board.tsx` - 칸반 보드 컨테이너
     - 3칼럼 그리드: "읽고 싶은 책" | "읽는 중" | "다 읽은 책"
     - 각 칼럼 상단: 카테고리명 + 권수
  3. `src/components/board/board-column.tsx` - 칼럼 컴포넌트
     - 칼럼 헤더 (이름, 카운트)
     - 책 카드 리스트 영역
     - "읽고 싶은 책" 칼럼에만 "책 추가" 버튼
  4. 데이터가 없을 때 빈 상태 UI (empty state)
- **산출물**: 3칼럼 칸반 보드 렌더링, 서버에서 조회한 책 데이터 표시

### T-4.03 책 카드 컴포넌트 구현

- [x] 완료
- **설명**: 칸반 보드에 표시되는 개별 책 카드 UI를 구현한다.
- **depends**: T-4.02
- **작업 내용**:
  1. `src/components/book/book-card.tsx` - 책 카드 컴포넌트
     - 표지 썸네일 (이미지 없을 시 placeholder)
     - 제목 (긴 제목은 말줄임 처리)
     - 저자
     - 상태별 추가 정보:
       - READING: 시작일 표시
       - FINISHED: 별점 표시 (★★★☆☆ 형태)
  2. 카드 클릭 시 `/books/[id]` 페이지로 이동
  3. 표지 이미지: `next/image` 사용, 로딩 실패 시 기본 아이콘 표시
- **산출물**: 각 상태별 카드가 올바른 정보를 표시

### T-4.04 드래그앤드롭 구현

- [x] 완료
- **설명**: @dnd-kit을 사용하여 칼럼 간 책 카드 드래그앤드롭을 구현한다.
- **depends**: T-4.03
- **작업 내용**:
  1. `src/components/board/kanban-board.tsx`에 DndContext 적용
     - DndContext, DragOverlay, closestCorners 전략
  2. 각 칼럼을 드롭 영역(useDroppable)으로 설정
  3. 각 카드를 드래그 가능(useDraggable)하게 설정
  4. 드래그 중 시각적 피드백:
     - 원본 카드 반투명 처리
     - DragOverlay로 드래그 중인 카드 미리보기 표시
     - 드롭 가능 칼럼 하이라이트
  5. 드롭 완료 시:
     - Zustand moveBook 호출 (낙관적 업데이트)
     - `PATCH /api/books/[id]` 호출 (상태 + 날짜 변경)
     - READING 이동 시 startedAt 자동 설정
     - FINISHED 이동 시 finishedAt 자동 설정
- **산출물**: 카드 드래그앤드롭으로 상태 변경 동작, 날짜 자동 기록

### T-4.05 검색 바 (목록 내 필터링) 구현

- [x] 완료
- **설명**: Header의 검색 바로 내 책 목록을 필터링하는 기능을 구현한다.
- **depends**: T-4.02
- **작업 내용**:
  1. `src/components/layout/header.tsx` 내 검색 바 기능 추가
     - 디바운스 300ms 적용
     - 제목, 저자 기준 클라이언트 측 필터링
  2. Zustand 스토어에 필터 상태 추가:
     ```typescript
     filterQuery: string;
     setFilterQuery: (query: string) => void;
     filteredBooks: () => Book[];
     ```
  3. 필터 결과가 없을 때 "검색 결과가 없습니다" 메시지
- **산출물**: 검색 바 입력 시 칸반 보드 실시간 필터링

### T-4.06 토스트 알림 시스템 구현

- [x] 완료
- **설명**: 사용자 액션에 대한 피드백을 토스트 메시지로 표시한다.
- **depends**: T-1.02
- **작업 내용**:
  1. shadcn/ui의 Toast (Sonner) 컴포넌트 설치 및 설정
     ```bash
     pnpm dlx shadcn@latest add sonner
     ```
  2. `src/app/layout.tsx`에 Toaster 컴포넌트 추가
  3. 토스트 적용 대상:
     - 책 추가 성공: "'{제목}'이 추가되었습니다"
     - 상태 변경 성공: "상태가 변경되었습니다"
     - 삭제 성공: "책이 삭제되었습니다"
     - API 에러: "오류가 발생했습니다. 다시 시도해주세요"
- **산출물**: 주요 액션 시 토스트 메시지 표시

---

## Phase 5: 책 상세 페이지

### T-5.01 책 상세 페이지 기본 레이아웃 구현

- [x] 완료
- **설명**: 책 상세 정보를 표시하는 페이지의 기본 레이아웃을 구현한다.
- **depends**: T-3.05
- **작업 내용**:
  1. `src/app/books/[id]/page.tsx` - 상세 페이지
     - 서버 컴포넌트에서 책 데이터 조회
     - 존재하지 않는 책 → 404 처리
  2. 레이아웃 구성:
     - 상단: 뒤로가기 버튼, 삭제 버튼
     - 책 정보 영역: 표지, 제목, 저자, 출판사, 연도, 페이지 수, ISBN
     - 상태 드롭다운 (상태 변경 가능)
     - 시작일/완료일 표시
     - 별점 표시/입력
     - 요약 섹션
     - 메모 섹션 (하단)
- **산출물**: 책 상세 페이지 렌더링, 책 정보 정상 표시

### T-5.02 상태 변경 드롭다운 구현

- [x] 완료
- **설명**: 상세 페이지에서 책 상태를 변경할 수 있는 드롭다운을 구현한다.
- **depends**: T-5.01
- **작업 내용**:
  1. `src/components/book/status-select.tsx` - 상태 선택 컴포넌트
     - shadcn/ui Select 사용
     - 현재 상태 표시, 3가지 상태 옵션
  2. 상태 변경 시:
     - `PATCH /api/books/[id]` 호출
     - READING: startedAt 자동 설정
     - FINISHED: finishedAt 자동 설정
     - 토스트 알림
  3. 모바일에서도 동일하게 동작
- **산출물**: 드롭다운으로 상태 변경 + 날짜 자동 기록

### T-5.03 별점 입력 컴포넌트 구현

- [x] 완료
- **설명**: 1~5점 별점을 클릭으로 입력/변경할 수 있는 컴포넌트를 구현한다.
- **depends**: T-5.01
- **작업 내용**:
  1. `src/components/book/star-rating.tsx` - 별점 컴포넌트
     - 빈 별(☆) 5개 렌더링
     - 클릭 시 해당 별까지 채움(★)
     - 호버 시 미리보기
     - 동일 별 재클릭 시 별점 제거 (null)
  2. 변경 시 즉시 `PATCH /api/books/[id]` 호출 (rating 필드)
  3. 읽기 전용 모드: 칸반 카드에서 사용 (클릭 불가, 표시만)
- **산출물**: 별점 입력/수정/표시 동작

### T-5.04 메모 CRUD API 구현

- [x] 완료
- **설명**: 메모 생성, 조회, 수정, 삭제 API를 구현한다.
- **depends**: T-1.06
- **작업 내용**:
  1. `src/app/api/books/[id]/notes/route.ts`
     - GET: 특정 책의 메모 목록 조회 (최신순 정렬)
     - POST: 메모 추가 (content 필수, user_id 세션에서 추출)
  2. `src/app/api/notes/[id]/route.ts`
     - PATCH: 메모 내용 수정
     - DELETE: 메모 삭제
  3. 모든 엔드포인트에서 인증 + 소유권 검증
- **산출물**: Notes CRUD API 정상 동작

### T-5.05 메모 목록 및 작성 UI 구현

- [x] 완료
- **설명**: 책 상세 페이지에서 메모를 조회하고 작성/편집/삭제할 수 있는 UI를 구현한다.
- **depends**: T-5.04, T-5.01
- **작업 내용**:
  1. `src/components/book/note-list.tsx` - 메모 목록 컴포넌트
     - 최신순 정렬, 작성 일시 표시 (상대 시간: "2시간 전")
     - 각 메모에 편집/삭제 버튼
  2. `src/components/book/note-editor.tsx` - 메모 작성/편집 컴포넌트
     - 텍스트 영역 (textarea)
     - "추가" 버튼 클릭 시 저장
     - 편집 모드: 인라인 편집 → 저장/취소 버튼
  3. 삭제 시 확인 다이얼로그
  4. 빈 상태: "아직 메모가 없습니다. 첫 메모를 작성해보세요!"
- **산출물**: 메모 추가/편집/삭제 전체 동작

### T-5.06 책 삭제 기능 구현

- [x] 완료
- **설명**: 상세 페이지에서 책을 삭제하는 기능을 구현한다.
- **depends**: T-5.01
- **작업 내용**:
  1. 상세 페이지 상단의 삭제 버튼
  2. 클릭 시 확인 다이얼로그: "'{제목}'을 삭제하시겠습니까? 관련 메모도 함께 삭제됩니다."
  3. 확인 시 `DELETE /api/books/[id]` 호출
  4. 삭제 성공 → `/`로 이동 + 토스트 메시지
- **산출물**: 책 삭제 → 메인 페이지 복귀, 칸반 보드에서 제거 확인

---

## Phase 6: 모바일 반응형 및 UX 마무리

### T-6.01 모바일 레이아웃 - 탭 네비게이션 구현

- [x] 완료
- **설명**: 모바일 환경에서 3칼럼 대신 탭 기반 단일 칼럼 레이아웃을 구현한다.
- **depends**: T-4.04
- **작업 내용**:
  1. `src/components/board/mobile-board.tsx` - 모바일 칸반 보드
     - 탭 3개: "읽고 싶은(N)" | "읽는 중(N)" | "완료(N)"
     - 활성 탭의 책 카드만 단일 칼럼으로 표시
  2. `src/components/board/kanban-board.tsx`에서 분기 처리
     - 768px 미만: MobileBoard 렌더링
     - 768px 이상: 기존 3칼럼 렌더링
  3. `useMediaQuery` 또는 CSS 미디어 쿼리 활용
- **산출물**: 모바일 너비에서 탭 기반 레이아웃 전환

### T-6.02 모바일 상태 변경 버튼 구현

- [x] 완료
- **설명**: 모바일에서 드래그앤드롭 대신 버튼으로 상태를 변경하는 UI를 구현한다.
- **depends**: T-6.01
- **작업 내용**:
  1. 모바일 카드에 상태 변경 버튼 추가
     - WANT_TO_READ: "읽기 시작 ▶" 버튼
     - READING: "독서 완료 ✓" 버튼
     - FINISHED: (상태 변경 버튼 없음, 상세에서 변경)
  2. 버튼 클릭 시 동일한 상태 변경 로직 실행
- **산출물**: 모바일에서 버튼 기반 상태 변경 동작

### T-6.03 모바일 Header 및 검색 UI 최적화

- [x] 완료
- **설명**: 모바일에서 Header와 검색 UI를 최적화한다.
- **depends**: T-6.01
- **작업 내용**:
  1. 모바일 Header:
     - 검색 바 → 돋보기 아이콘으로 축소, 클릭 시 전체 화면 검색 오버레이
     - 프로필 아이콘 유지
  2. 책 추가 FAB (Floating Action Button)
     - 화면 우하단 고정 버튼
     - 클릭 시 검색 모달 오픈
  3. 검색 모달: 모바일에서 전체 화면으로 표시
- **산출물**: 모바일에서 편리한 검색/추가 UX

### T-6.04 책 상세 페이지 모바일 최적화

- [x] 완료
- **설명**: 책 상세 페이지의 모바일 레이아웃을 최적화한다.
- **depends**: T-5.05
- **작업 내용**:
  1. 표지 + 정보 영역: 데스크톱은 가로 배치, 모바일은 세로 배치
  2. 메모 입력 영역: 모바일에서 충분한 터치 영역 확보
  3. 별점 입력: 터치 친화적 크기 (44px 이상)
  4. 전체적으로 패딩/마진 조정
- **산출물**: 모바일에서 상세 페이지 사용성 확인

### T-6.05 로딩 및 에러 상태 UI 구현

- [x] 완료
- **설명**: 주요 페이지의 로딩, 에러, 빈 상태 UI를 구현한다.
- **depends**: T-4.02, T-5.01
- **작업 내용**:
  1. `src/app/loading.tsx` - 전역 로딩 UI (스켈레톤)
  2. `src/app/error.tsx` - 전역 에러 바운더리
  3. 칸반 보드 로딩: 칼럼 스켈레톤
  4. 책 상세 로딩: 정보 영역 스켈레톤
  5. 빈 상태 (책 0권):
     - "아직 등록된 책이 없습니다. 첫 번째 책을 추가해보세요!"
     - CTA 버튼: "책 추가하기"
  6. 네트워크 에러: "연결에 실패했습니다. 다시 시도해주세요" + 재시도 버튼
- **산출물**: 모든 비정상 상태에서 적절한 UI 표시

---

## Phase 7: 배포 및 최종 마무리

### T-7.01 환경 변수 및 보안 점검

- [x] 완료
- **설명**: 배포 전 환경 변수 설정과 보안 사항을 최종 점검한다.
- **depends**: Phase 1~6 전체
- **작업 내용**:
  1. 환경 변수 목록 확인:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `OPENAI_API_KEY`
  2. 클라이언트 노출 변수 (`NEXT_PUBLIC_*`) 확인: API 키가 포함되지 않았는지 검증
  3. Supabase RLS 정책 재확인
  4. API Route에서 인증 누락 없는지 점검
  5. LLM 프롬프트 인젝션 방어 확인 (사용자 입력 sanitize)
- **산출물**: 보안 체크리스트 통과

### T-7.02 Vercel 배포

- [x] 완료
- **설명**: Vercel에 프로젝트를 배포한다.
- **depends**: T-7.01
- **작업 내용**:
  1. GitHub 리포지토리 연결
  2. Vercel 프로젝트 생성 및 환경 변수 설정
  3. 빌드 확인: `pnpm build` 에러 없음
  4. 배포 후 프로덕션 URL 확인
  5. Supabase OAuth 리다이렉트 URL에 프로덕션 도메인 추가
  6. 기본 동작 점검:
     - 로그인 → 책 검색 → 등록 → 상태 변경 → 메모 작성 → 삭제
- **산출물**: 프로덕션 URL에서 전체 기능 동작

### T-7.03 SEO 및 메타데이터 설정

- [x] 완료
- **설명**: 기본적인 SEO 메타데이터를 설정한다.
- **depends**: T-7.02
- **작업 내용**:
  1. `src/app/layout.tsx` 메타데이터 설정:
     - title: "ReadArchive - 나만의 독서 아카이브"
     - description: "책 이름만 입력하면 자동으로 책 정보를 수집하고, 독서 현황을 관리하세요."
     - Open Graph 이미지 (간단한 정적 이미지)
  2. favicon 설정
  3. `robots.txt`, `sitemap.xml` 기본 설정
- **산출물**: SNS 공유 시 OG 이미지/제목/설명 표시

### T-7.04 최종 QA 및 버그 수정

- [x] 완료
- **설명**: 전체 기능을 수동 테스트하고 발견된 버그를 수정한다.
- **depends**: T-7.02
- **작업 내용**:
  1. 테스트 시나리오 실행:
     - [x] 신규 사용자 가입 (Google)
     - [x] 신규 사용자 가입 (GitHub)
     - [x] 책 검색 (LLM 정상 응답)
     - [x] 책 검색 (캐시 히트)
     - [x] 수동 입력으로 책 등록
     - [x] 드래그앤드롭 상태 변경 (데스크톱)
     - [x] 버튼 상태 변경 (모바일)
     - [x] 별점 입력/수정
     - [x] 메모 작성/편집/삭제
     - [x] 책 삭제
     - [x] 목록 내 검색/필터링
     - [x] 로그아웃 → 재로그인
  2. 크로스 브라우저 테스트: Chrome, Safari, Firefox
  3. 모바일 실기기 테스트: iOS Safari, Android Chrome
  4. 발견된 버그 수정
- **산출물**: 모든 테스트 시나리오 통과

---

## 작업 의존성 요약

```
Phase 1 (셋업)
  T-1.01 → T-1.02 → T-1.03 → T-1.04
     ↓                            ↓
  T-1.07 (Docker)                 │
                                  ↓
  T-1.05 → T-1.06 ←──────────────┘

Phase 2 (인증)
  T-1.06 → T-2.01 → T-2.02 → T-2.03 → T-2.04

Phase 3 (검색/등록)
  T-1.06 ──→ T-3.01 → T-3.02 → T-3.03 → T-3.04 → T-3.06
  T-1.06 ──→ T-3.05 ──────────────────────────────↗

Phase 4 (칸반 보드)
  T-1.04 ──→ T-4.01 → T-4.02 → T-4.03 → T-4.04
  T-3.05 ──────────↗          ↓
  T-1.02 → T-4.06             T-4.05

Phase 5 (상세 페이지)
  T-3.05 → T-5.01 → T-5.02
                   → T-5.03
  T-1.06 → T-5.04 → T-5.05
  T-5.01 → T-5.06

Phase 6 (모바일/UX)
  T-4.04 → T-6.01 → T-6.02
                   → T-6.03
  T-5.05 → T-6.04
  T-4.02 + T-5.01 → T-6.05

Phase 7 (배포)
  All → T-7.01 → T-7.02 → T-7.03
                         → T-7.04
```

---

## Phase별 핵심 산출물 요약

| Phase | 핵심 산출물 |
|-------|------------|
| Phase 1: 프로젝트 셋업 | Next.js 프로젝트, DB 스키마, 클라이언트 설정, Docker 개발 환경 |
| Phase 2: 인증 | 소셜 로그인, Header, 라우트 보호 |
| Phase 3: 검색/등록 | LLM 검색, 폴백, 캐싱, 검색 모달 |
| Phase 4: 칸반 보드 | 3칼럼 보드, 드래그앤드롭, 필터링 |
| Phase 5: 상세 페이지 | 상태 변경, 별점, 메모 CRUD |
| Phase 6: 모바일/UX | 반응형, 로딩/에러 상태 |
| Phase 7: 배포 | Vercel 배포, QA, 버그 수정 |
