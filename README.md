# ReadArchive - 나만의 독서 아카이브

책 이름만 입력하면 AI가 자동으로 책 정보를 수집하고, 칸반 보드로 독서 현황을 관리하는 웹 서비스입니다.

## 주요 기능

- **AI 책 검색**: OpenAI GPT-4o-mini 기반 책 정보 자동 수집, Google Books API 폴백
- **칸반 보드**: 드래그앤드롭으로 독서 상태 관리 (읽고 싶은 책 → 읽는 중 → 다 읽은 책)
- **별점 & 메모**: 읽은 책에 별점과 독서 메모 기록
- **소셜 로그인**: Google / GitHub OAuth
- **반응형 디자인**: 데스크톱(드래그앤드롭) / 모바일(탭 + 버튼) 최적화

## 기술 스택

| 계층 | 기술 |
|------|------|
| 프론트엔드 | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| UI 컴포넌트 | shadcn/ui |
| 드래그앤드롭 | @dnd-kit/core |
| 상태 관리 | Zustand |
| 백엔드/DB | Supabase (PostgreSQL + Auth + RLS) |
| AI 검색 | OpenAI GPT-4o-mini |
| 배포 | Vercel |

## 시작하기

### 사전 요구사항

- Node.js 22+
- pnpm

### 설치

```bash
git clone https://github.com/kwoninho/ReadArchive.git
cd ReadArchive
pnpm install
```

### 환경 변수 설정

`.env.local.example`을 복사하여 `.env.local` 파일을 생성하고 값을 입력합니다.

```bash
cp .env.local.example .env.local
```

| 변수명 | 설명 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `OPENAI_API_KEY` | OpenAI API 키 |

### 실행

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
├── app/                  # Next.js App Router 페이지 및 API
│   ├── api/              # REST API (books, notes, search)
│   ├── books/[id]/       # 책 상세 페이지
│   └── login/            # 로그인 페이지
├── components/
│   ├── board/            # 칸반 보드 (데스크톱 + 모바일)
│   ├── book/             # 책 카드, 상세, 별점, 메모
│   ├── layout/           # Header
│   ├── search/           # 검색 모달
│   └── ui/               # shadcn/ui 컴포넌트
├── lib/
│   ├── supabase/         # Supabase 클라이언트 (브라우저/서버)
│   └── search/           # LLM 검색, Google Books, 캐싱
├── stores/               # Zustand 상태 관리
└── types/                # TypeScript 타입 정의
```

## 라이선스

MIT
