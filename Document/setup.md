# ReadArchive 환경 구성 가이드

> 이 문서는 AI agent가 자동으로 환경을 구성하기 위한 실행 명세다. 순서대로 실행하라.

## 사전 요구사항

- Node.js 22+
- pnpm (corepack)
- Docker, Docker Compose
- Supabase 프로젝트 (https://supabase.com)
- Gemini API 키 (https://aistudio.google.com/apikey)
- (선택) Google Books API 키 (https://console.cloud.google.com)

## 1. 저장소 클론

```bash
git clone <REPO_URL> ReadArchive
cd ReadArchive
```

## 2. Node.js / pnpm 활성화

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## 3. 환경 변수 설정

`.env.local.example`을 복사하고 값을 채운다.

```bash
cp .env.local.example .env.local
```

필수 환경 변수:

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | O |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public 키 | O |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role 키 (검색 캐시용) | O |
| `GEMINI_API_KEY` | Google Gemini API 키 (책 검색용) | O |
| `GOOGLE_BOOKS_API_KEY` | Google Books API 키 (표지/메타데이터 보강) | 선택 |

값 확인 경로:
- Supabase: 프로젝트 대시보드 → Settings → API
- Gemini: https://aistudio.google.com/apikey
- Google Books: https://console.cloud.google.com → APIs & Services → Credentials

## 4. Supabase DB 스키마 적용

Supabase SQL Editor에서 `supabase/schema.sql` 전체를 실행한다.

생성되는 테이블:
- `books` — 책 정보 (RLS 적용, user_id 기반)
- `notes` — 독서 메모 (RLS 적용, user_id 기반)
- `search_cache` — LLM/Google Books 검색 캐시

## 5. Docker로 로컬 개발 환경 실행

```bash
docker compose up --build
```

- 접속: http://localhost:3000
- Hot reload 활성화 (소스 볼륨 마운트 + WATCHPACK_POLLING)
- `dev` 스테이지 빌드 (node:22-alpine)

중지:

```bash
docker compose down
```

## 6. Docker 없이 로컬 실행 (대안)

```bash
pnpm install --frozen-lockfile
pnpm dev
```

- 접속: http://localhost:3000

## 7. 테스트 실행

```bash
pnpm test          # 전체 테스트
pnpm test:watch    # 감시 모드
pnpm test:coverage # 커버리지 리포트
```

- 프레임워크: Vitest + jsdom + React Testing Library
- 테스트 위치: `src/**/__tests__/**/*.test.{ts,tsx}`

## 8. 빌드 검증

```bash
pnpm build
```

빌드 성공 시 환경 구성 완료.

## 기술 스택 요약

| 계층 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router, TypeScript) |
| 스타일링 | Tailwind CSS 4 + shadcn/ui |
| 드래그앤드롭 | @dnd-kit/core + @dnd-kit/sortable |
| 상태 관리 | Zustand |
| 백엔드/DB | Supabase (PostgreSQL, RLS) |
| 인증 | Supabase Auth |
| LLM | Google Gemini 2.5 Flash |
| 테스트 | Vitest + React Testing Library |
| 컨테이너 | Docker (node:22-alpine) |
| 배포 | Vercel |
| 패키지 매니저 | pnpm |

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| Docker에서 파일 변경 감지 안 됨 | WSL2/Windows 볼륨 이슈 | `WATCHPACK_POLLING=true` 이미 설정됨, `docker compose restart` |
| `pnpm: command not found` | corepack 미활성화 | `corepack enable` 실행 |
| 빌드 시 환경 변수 에러 | `.env.local` 누락 | `.env.local.example` 복사 후 값 입력 |
| Supabase RLS 에러 (403) | 스키마 미적용 또는 인증 누락 | `supabase/schema.sql` 실행 확인 |
| 검색 API 할당량 초과 | Google Books 무료 한도 | `GOOGLE_BOOKS_API_KEY` 설정 |
