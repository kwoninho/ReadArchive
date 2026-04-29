# ReadArchive - 완료된 작업 이력 (History)

> **기반 문서**: plan.md v1.0 (PRD v1.0)
> **정렬**: 최신 작업이 상단에 위치

---

## 독서 상태 확장

### '읽다 멈춤' 상태 추가 - 2026-04-29
- `src/types/index.ts`: `BOOK_STATUSES`에 `PAUSED` 추가 (`BookStatus` 자동 확장)
- `supabase/migrations/006_add_paused_book_status.sql`, `supabase/schema.sql`: `books_status_check` 제약을 `('WANT_TO_READ','READING','PAUSED','FINISHED')`로 갱신 — 원격 DB에 별도 적용 필요
- `kanban-board`: 데스크톱 그리드 3→4 컬럼, `board-column`에 `⏸️ 읽다 멈춤` 라벨 추가
- `mobile-board`: `멈춤` 탭 추가, `READING→PAUSED`(읽다 멈춤) 및 `PAUSED→READING`(다시 읽기) 상태 이동 버튼; 카드별 다중 액션 지원
- `status-select`: 상세 화면 상태 선택 옵션에 `읽다 멈춤` 추가
- 자동 동기화 동작 유지: `READING` 전환 시 `started_at`, `FINISHED` 전환 시 `finished_at`/`current_page` 자동 설정. `PAUSED` 전환은 별도 부수효과 없음
- 테스트: `helpers.test`/`route.test`(API 검증 + PAUSED 부수효과 미발생), `book-store.test`(moveBook PAUSED 분기, `booksByStatus` 필터), `mobile-board.test` 신규(탭/액션 렌더)

---

## 검색 기능 개선

### Next.js Image 최적화 활성화 - 2026-04-18
- `next.config.ts`: `images.remotePatterns`로 `books.google.com`, `books.google.co.kr`, `covers.openlibrary.org`, `**.googleusercontent.com` 화이트리스트
- `book-card`, `book-detail`, `mobile-board`, `search-result-card`: `<Image unoptimized>` 제거
- 표지 이미지 리사이즈/포맷 변환이 서버에서 처리되어 모바일 대역폭 절약

### LLM 응답 런타임 검증 - 2026-04-18
- `llm-search.ts`: `normalizeCandidate` 도입
- `toStr`/`toInt` 헬퍼로 Gemini가 숫자를 문자열로 돌려주는 경우도 안전하게 coerce
- 누락 필드는 기본값으로 채움, title 없는 항목은 결과에서 제외
- 테스트 3건 추가: 숫자 coerce, 기본값, title 필터

### 표지 검색 마감 - 2026-04-18
- `open-library.ts`: `isValidIsbnLength`로 10/13자 아닌 ISBN은 URL 생성 스킵 (항상 404 방지)
- `google-books-search.ts`: `fetchCovers` 타겟 5→10으로 확대 (LLM 반환 최대치에 맞춤)
- Open Library 테스트 1건 추가

### 검색 레이트리미터 DB 이전 - 2026-04-18
- `supabase/migrations/004_search_rate_limits.sql`: `search_rate_limits` 테이블 + `check_search_rate_limit(user_id, limit, window_seconds)` RPC
- RPC는 `ON CONFLICT ... UPDATE`로 원자적 check-and-increment (1분 윈도우, 분당 10회)
- 함수 권한 service_role만, 테이블 RLS 기본 차단
- `src/lib/search/rate-limit.ts`: RPC 래퍼, 실패 시 fail-open + 로깅
- `route.ts`: in-memory Map 제거 → `checkSearchRateLimit(user.id)` 호출
- 테스트 4건: 허용/초과/RPC 오류/기본값
- 효과: serverless 인스턴스 간 한도 공유 (기존 인스턴스별 10회 → 전역 10회)

### 검색 캐시 UPSERT 전환 + source 제약 정정 - 2026-04-18
- `supabase/migrations/003_search_cache_upsert.sql`: 중복 행 정리, `query` UNIQUE 제약, `source` CHECK `'llm'→'gemini'`로 정정
- 기존 CHECK(`source IN ('llm','google_books')`) 위반으로 모든 Gemini 캐시가 silent reject되던 잠재 버그 해소
- `cache.setCachedSearch`: insert → `upsert({onConflict:'query'})`, 오류 `console.error` 로깅
- `schema.sql`: UNIQUE 제약과 source 집합 반영
- `route.ts`: 캐시 저장 `.catch(()=>{})` 제거 → 로깅으로 가시화
- 테스트 2건 추가 (upsert 시그니처, 오류 로깅)

### 검색 API 타임아웃 추가 - 2026-04-18
- Gemini `generateContent`: Promise.race + clearTimeout으로 6s 상한
- Google Books 메인 검색: `AbortSignal.timeout(8000)`
- `fetchCovers` 후보별 fetch: `AbortSignal.timeout(5000)`
- 외부 API 지연 시 API route hang 방지, Google Books 폴백으로 빠르게 전환

### 표지 이미지 검색률 개선 - 2026-04-18
- `fetchCovers()` 매칭 로직 강화: 후보별 타겟 쿼리(`isbn:` / `intitle+inauthor`), `Promise.allSettled`로 독립 처리
- ISBN/제목 정규화 비교로 하이픈·대소문자·구두점 차이에도 매칭
- `thumbnail` 없을 때 `smallThumbnail` fallback
- 신규 `src/lib/search/open-library.ts`: ISBN 기반 Open Library Covers URL 구성 fallback
- `/api/search` Gemini/Google Books 두 경로 모두 Open Library 보강 연결
- 테스트 14건 추가 (fetchCovers 8, open-library 7, searchBooksWithGoogleBooks smallThumbnail 2)

---

## Phase 10: 책 상세 페이지 기능 확장

### T-10.19 날짜/시간 포맷 유틸 공용화 - 2026-03-08
- `src/lib/format.ts`: formatDateTime(KST YYYY-MM-DD HH:mm), formatDate, formatRelativeTime

### T-10.18 카테고리 갱신 실패 복구 보강 - 2026-03-08
- PATCH route에서 기존 카테고리 백업 후 insert 실패 시 복구 재삽입

### T-10.17 책 입력 정규화 로직 공용화 - 2026-03-08
- `src/lib/api/helpers.ts`: isValidPositiveInt, normalizeOptionalString, parseBookMetadataFields

### T-10.16 상세 페이지 mutation 직렬화 정리 - 2026-03-08
- book-detail.tsx에 mutatingRef 기반 직렬화, 공통 patchBook 헬퍼

### T-10.15 BookDetail 편집 모드 테스트 추가 - 2026-03-08
- book-detail-edit.test.tsx: 편집 전환, 취소, 진행률 조건부 표시, 메모 유지 (6 tests)

### T-10.14 BookDetail 편집 모드 통합 - 2026-03-08
- isEditing 상태, 수정 버튼(Pencil), BookEditForm 전환, 편집 중 버튼 숨김

### T-10.13 BookEditForm 테스트 추가 - 2026-03-08
- book-edit-form.test.tsx: 초기값, 카테고리 토글, 저장/취소, 빈 제목 비활성화 (6 tests)

### T-10.12 BookEditForm 컴포넌트 구현 - 2026-03-08
- 전체 메타데이터 편집 폼, 카테고리 Badge 토글, Textarea 컴포넌트 추가

### T-10.11 PATCH API 메타데이터 테스트 추가 - 2026-03-08
- helpers.test.ts 확장: parseBookMetadataFields, normalizeOptionalString, isValidPositiveInt (23+ tests)

### T-10.10 PATCH API 메타데이터 필드 지원 - 2026-03-08
- title, author, publisher, publishedYear, isbn, pageCount, summary, coverUrl, categoryIds 지원
- pageCount 변경 시 currentPage 자동 보정

### T-10.09 ReadingProgress 및 상세 페이지 통합 테스트 추가 - 2026-03-08
- reading-progress.test.tsx: 진행률 바, 저장, Enter키, 음수/초과 방지 (7 tests)

### T-10.08 ReadingProgress 컴포넌트 구현 - 2026-03-08
- 프로그레스 바 + 백분율, 페이지 입력 + 저장 버튼, pageCount 없을 때 안내 문구

### T-10.07 PATCH API currentPage 테스트 추가 - 2026-03-08
- route.test.ts: 유효성 검증, 인증, 404, pageCount 참조 (9 tests)

### T-10.06 PATCH API currentPage 지원 - 2026-03-08
- currentPage 검증(0+, ≤pageCount), FINISHED 자동 동기화, moveBook 낙관적 업데이트

### T-10.05 타입 및 매핑 테스트 보강 - 2026-03-08
- makeBook/makeRawBook에 currentPage/current_page 추가, mapBookFromDB 테스트 보강

### T-10.04 타입 및 매핑 업데이트 - 2026-03-08
- Book 타입에 currentPage: number | null 추가, mapBookFromDB 매핑 추가

### T-10.03 DB 마이그레이션 current_page 컬럼 추가 - 2026-03-08
- 002_current_page.sql, schema.sql에 current_page INTEGER CHECK (>= 0) 추가

### T-10.02 메모 작성 날짜 표시 테스트 추가 - 2026-03-08
- note-list.test.tsx: formatDateTime/formatRelativeTime 출력 검증 (3 tests)

### T-10.01 메모 작성 날짜 표시 적용 - 2026-03-08
- note-list.tsx에서 공용 format 유틸 사용, 절대시간 + 상대시간 병행 표시

### T-10.00 정책 확정 및 검증 기준 정리 - 2026-03-08
- currentPage number|null, FINISHED 자동 동기화, 문자열 정규화, KST 날짜 포맷 정책 확정

---

## Phase 9: 카테고리 UI

### T-9.04 카테고리별 필터링 기능 - 2026-03-08
- Zustand store에 selectedCategory 필터 상태 및 allCategories 파생 함수 추가
- CategoryFilter 칩 UI 컴포넌트 (전체/개별 카테고리 선택)
- 검색 쿼리와 AND 조건 필터링, KanbanBoard에 통합

### T-9.03 칸반 보드 책 카드에 카테고리 표시 - 2026-03-08
- BookCard에 CategoryBadge 추가 (maxCount=2, "+N" 표시)

### T-9.02 도서 상세 페이지에 카테고리 표시 - 2026-03-08
- BookDetail에 CategoryBadge 추가 (제목/저자 아래 배치)

### T-9.01 카테고리 배지 컴포넌트 구현 - 2026-03-08
- shadcn Badge 기반 CategoryBadge 공용 컴포넌트
- maxCount 옵션, 빈 배열 null 반환, 접근성 aria 속성

---

## Phase 8: 도서 카테고리 분리

### T-8.01 도서 카테고리 별도 테이블 분리 - 2026-03-07
- `categories`, `book_categories` 기반 스키마 및 마이그레이션 추가
- Books API, SSR 조회 경로, Zustand 매핑을 다중 카테고리 구조에 맞게 수정
- 카테고리 정규화/매핑 로직과 카테고리 조회 API 및 관련 테스트 추가

---

## Phase 7: 배포 및 최종 마무리

### T-7.04 최종 QA 및 버그 수정 - 2026-03-02
- 전체 기능 수동 테스트, 크로스 브라우저/모바일 테스트 통과

### T-7.03 SEO 및 메타데이터 설정 - 2026-03-02
- 메타데이터, OG 이미지, favicon, robots.txt, sitemap.xml

### T-7.02 Vercel 배포 - 2026-03-02
- Vercel 프로젝트 배포, 프로덕션 URL 동작 확인

### T-7.01 환경 변수 및 보안 점검 - 2026-03-02
- 환경 변수 검증, RLS 재확인, 인증 누락 점검

---

## Phase 6: 모바일 반응형 및 UX 마무리

### T-6.05 로딩 및 에러 상태 UI 구현 - 2026-03-01
- 스켈레톤 로딩, 에러 바운더리, 빈 상태 UI

### T-6.04 책 상세 페이지 모바일 최적화 - 2026-03-01
- 세로 배치, 터치 친화적 크기 조정

### T-6.03 모바일 Header 및 검색 UI 최적화 - 2026-03-01
- 모바일 검색 오버레이, FAB 버튼

### T-6.02 모바일 상태 변경 버튼 구현 - 2026-03-01
- 드래그앤드롭 대체 버튼 기반 상태 변경

### T-6.01 모바일 레이아웃 - 탭 네비게이션 구현 - 2026-03-01
- 768px 미만 탭 기반 단일 칼럼 레이아웃

---

## Phase 5: 책 상세 페이지

### T-5.06 책 삭제 기능 구현 - 2026-03-01
- 삭제 확인 다이얼로그, CASCADE 삭제, 메인 페이지 복귀

### T-5.05 메모 목록 및 작성 UI 구현 - 2026-03-01
- 메모 목록, 인라인 편집, 삭제 확인 다이얼로그

### T-5.04 메모 CRUD API 구현 - 2026-03-01
- Notes GET/POST/PATCH/DELETE API, 소유권 검증

### T-5.03 별점 입력 컴포넌트 구현 - 2026-03-01
- 1~5점 별점 입력/수정/표시, 읽기 전용 모드

### T-5.02 상태 변경 드롭다운 구현 - 2026-03-01
- shadcn/ui Select 기반 상태 변경, 날짜 자동 기록

### T-5.01 책 상세 페이지 기본 레이아웃 구현 - 2026-03-01
- `/books/[id]` 상세 페이지 레이아웃, 404 처리

---

## Phase 4: 칸반 보드 (메인 대시보드)

### T-4.06 토스트 알림 시스템 구현 - 2026-03-01
- Sonner 기반 토스트 알림 (추가/변경/삭제/에러)

### T-4.05 검색 바 (목록 내 필터링) 구현 - 2026-03-01
- Header 검색 바 디바운스 필터링 (제목, 저자 기준)

### T-4.04 드래그앤드롭 구현 - 2026-03-01
- @dnd-kit 기반 칼럼 간 드래그앤드롭, 시각적 피드백, 낙관적 업데이트

### T-4.03 책 카드 컴포넌트 구현 - 2026-03-01
- 표지 썸네일, 제목, 저자, 상태별 추가 정보 표시

### T-4.02 칸반 보드 레이아웃 구현 - 2026-03-01
- 3칼럼 칸반 보드 (읽고 싶은 책 / 읽는 중 / 다 읽은 책), 빈 상태 UI

### T-4.01 Zustand 스토어 설정 - 2026-03-01
- BookStore (fetchBooks, addBook, updateBook, removeBook, moveBook), 낙관적 업데이트

---

## Phase 3: 책 검색 및 등록 기능

### T-3.06 책 검색 모달 UI 구현 - 2026-03-01
- 검색 모달, 결과 카드, 수동 입력 폼 구현

### T-3.05 책 CRUD API 엔드포인트 구현 - 2026-03-01
- Books GET/POST/PATCH/DELETE API, 상태 변경 시 날짜 자동 설정

### T-3.04 통합 검색 API 엔드포인트 구현 - 2026-03-01
- `POST /api/search`: 캐시 → LLM → Google Books 순서 폴백, Rate limiting

### T-3.03 검색 캐싱 레이어 구현 - 2026-03-01
- search_cache 테이블 기반 캐시 조회/저장 (30일 만료)

### T-3.02 Google Books API 폴백 구현 - 2026-03-01
- LLM 실패 시 Google Books API 폴백 검색 구현

### T-3.01 OpenAI 클라이언트 및 검색 프롬프트 구현 - 2026-03-01
- LLM 기반 책 검색 함수, Open Library Covers API 연동

---

## Phase 2: 인증 시스템

### T-2.04 공통 레이아웃 및 Header 구현 - 2026-03-01
- 루트 레이아웃, Header (로고, 검색 바, 프로필 드롭다운) 구현

### T-2.03 OAuth 로그인/로그아웃 로직 구현 - 2026-03-01
- signInWithOAuth, 콜백 처리, 로그아웃, 라우트 보호 구현

### T-2.02 로그인 페이지 UI 구현 - 2026-03-01
- `/login` 페이지에 소셜 로그인 버튼 UI 구현

### T-2.01 Supabase Auth 소셜 로그인 설정 - 2026-03-01
- Google, GitHub OAuth 프로바이더 설정

---

## Phase 1: 프로젝트 초기 셋업

### T-1.07 Docker 로컬 개발 환경 구성 - 2026-03-01
- 멀티스테이지 Dockerfile, docker-compose.yml, 핫 리로드 설정

### T-1.06 Supabase 클라이언트 유틸리티 작성 - 2026-03-01
- 브라우저/서버용 Supabase 클라이언트 설정, 인증 세션 갱신 미들웨어 구현

### T-1.05 Supabase 프로젝트 설정 및 DB 스키마 생성 - 2026-03-01
- books, notes, search_cache 테이블 생성, RLS 정책 설정, 인덱스 및 트리거 구성

### T-1.04 TypeScript 타입 정의 - 2026-03-01
- Book, Note, SearchCandidate, BookCreateInput, BookUpdateInput 등 타입 정의

### T-1.03 프로젝트 디렉토리 구조 설정 - 2026-03-01
- App Router 기반 디렉토리 구조 생성 (app, components, lib, stores, types)

### T-1.02 핵심 의존성 설치 - 2026-03-01
- Supabase, shadcn/ui, dnd-kit, Zustand, OpenAI, 유틸리티 라이브러리 설치

### T-1.01 Next.js 프로젝트 생성 - 2026-03-01
- Next.js 14+ App Router 기반 프로젝트 초기화, 보일러플레이트 정리, `.env.local.example` 생성
