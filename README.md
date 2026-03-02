# ReadArchive - 나만의 독서 아카이브

책 이름만 입력하면 AI가 자동으로 책 정보를 수집하고, 칸반 보드로 독서 현황을 관리하는 개인용 웹서비스입니다.

## 주요 기능

- **AI 책 검색** - OpenAI GPT-4o-mini가 책 정보를 자동 수집하고, Google Books API가 폴백으로 동작합니다. 검색 결과는 30일간 캐싱됩니다.
- **칸반 보드** - 드래그앤드롭으로 독서 상태를 관리합니다 (읽고 싶은 책 → 읽는 중 → 다 읽은 책).
- **별점 & 메모** - 읽은 책에 1~5점 별점과 독서 메모를 기록합니다.
- **소셜 로그인** - Google / GitHub OAuth로 간편하게 로그인합니다.
- **반응형 디자인** - 데스크톱은 드래그앤드롭, 모바일은 탭+버튼 기반 UI를 제공합니다.

## 기술 스택

| 계층 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 16.1.6 |
| 언어 | TypeScript | 5.x |
| UI | Tailwind CSS + shadcn/ui (Radix UI) | v4 |
| 드래그앤드롭 | @dnd-kit/core | 6.3.1 |
| 상태 관리 | Zustand | 5.0.11 |
| 백엔드/DB | Supabase (PostgreSQL + Auth + RLS) | - |
| AI 검색 | OpenAI GPT-4o-mini | - |
| 테스트 | Vitest + React Testing Library | 4.0.18 |
| 배포 | Vercel | - |
| 패키지 매니저 | pnpm | - |

## 시작하기

### 사전 요구사항

- Node.js 22+
- pnpm

### 설치 및 실행

```bash
git clone https://github.com/kwoninho/ReadArchive.git
cd ReadArchive
pnpm install
```

`.env.local.example`을 복사하여 `.env.local` 파일을 생성하고 값을 입력합니다.

```bash
cp .env.local.example .env.local
```

| 변수명 | 설명 | 노출 범위 |
|--------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | 클라이언트 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | 클라이언트 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (검색 캐시용) | 서버 전용 |
| `OPENAI_API_KEY` | OpenAI API 키 (LLM 검색용) | 서버 전용 |

```bash
pnpm dev
```

http://localhost:3000 에서 확인할 수 있습니다.

### Docker로 실행

```bash
docker compose up
```

## 프로젝트 구조

```
src/
├── app/                        # Next.js App Router
│   ├── api/
│   │   ├── books/              #   GET /api/books, POST /api/books
│   │   │   └── [id]/           #   GET, PATCH, DELETE /api/books/:id
│   │   │       └── notes/      #   GET, POST /api/books/:id/notes
│   │   ├── notes/[id]/         #   PATCH, DELETE /api/notes/:id
│   │   └── search/             #   POST /api/search
│   ├── auth/callback/          # OAuth 콜백 처리
│   ├── books/[id]/             # 책 상세 페이지
│   ├── login/                  # 로그인 페이지
│   ├── layout.tsx              # 루트 레이아웃
│   └── page.tsx                # 메인 대시보드 (칸반 보드)
│
├── components/
│   ├── board/                  # 칸반 보드 (데스크톱 DnD + 모바일 탭)
│   ├── book/                   # 책 카드, 상세, 별점, 메모
│   ├── layout/                 # Header
│   ├── search/                 # 검색 모달, 결과 카드, 수동 입력 폼
│   └── ui/                     # shadcn/ui 공통 컴포넌트
│
├── lib/
│   ├── api/                    # API 라우트 공통 헬퍼 (인증, 검증, 파싱)
│   ├── search/                 # 검색 엔진 (LLM, Google Books, 캐시)
│   ├── supabase/               # Supabase 클라이언트 (브라우저/서버)
│   └── utils.ts                # cn() 유틸리티
│
├── stores/                     # Zustand 클라이언트 상태
├── hooks/                      # 커스텀 훅 (useMediaQuery)
├── types/                      # 공유 TypeScript 타입
└── test/                       # Vitest 셋업 (목 설정)
```

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `pnpm dev` | 개발 서버 실행 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm start` | 프로덕션 서버 실행 |
| `pnpm lint` | ESLint 실행 |
| `pnpm test` | 테스트 실행 |
| `pnpm test:watch` | 테스트 워치 모드 |
| `pnpm test:coverage` | 테스트 커버리지 리포트 |

## API 엔드포인트

모든 API는 Supabase Auth 인증이 필요합니다.

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/books?status=STATUS` | 책 목록 조회 (상태 필터 가능) |
| POST | `/api/books` | 새 책 등록 |
| GET | `/api/books/:id` | 책 상세 조회 |
| PATCH | `/api/books/:id` | 책 정보 수정 (상태, 별점, 날짜) |
| DELETE | `/api/books/:id` | 책 삭제 |
| POST | `/api/search` | 책 검색 (캐시 → LLM → Google Books) |
| GET | `/api/books/:id/notes` | 메모 목록 조회 |
| POST | `/api/books/:id/notes` | 메모 추가 |
| PATCH | `/api/notes/:id` | 메모 수정 |
| DELETE | `/api/notes/:id` | 메모 삭제 |

## 검색 파이프라인

```
사용자 입력 → 캐시 조회 → (미스) LLM 검색 → (실패) Google Books → (실패) 수동 입력 폼
                ↓ 히트         ↓ 성공            ↓ 성공
              즉시 반환      캐시 저장 후 반환   캐시 저장 후 반환
```

- **Rate Limit**: 사용자당 분당 10회
- **검색어 제한**: 1~100자
- **캐시 만료**: 30일
- **최대 후보 수**: 5개

## 라이선스

MIT
