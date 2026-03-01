# 프로젝트 공통 에이전트 지침

> 이 파일은 AI 에이전트(Claude, Copilot, Cursor 등)가 공통으로 따라야 할 프로젝트 규칙을 정의한다.

## 언어 규칙

- **코드 작성**: 영어 사용 (변수명, 함수명, 클래스명, 타입명 등 모든 식별자)
- **주석**: 한국어로 작성
- **문서**: 한국어로 작성 (README, 기획 문서, PR 설명 등)
- **커밋 메시지**: 한국어로 작성

## 워크플로우 규칙

- 각 작업(태스크)이 완료될 때마다 자동으로 git commit을 수행한다.
- 작업 중 실수, 모호한 판단, 또는 이후 동일 실수를 방지할 지침이 필요한 경우 이 파일(`AGENTS.md`)에 해당 내용을 추가한다.
  - 예: 잘못된 컨벤션 적용, 누락된 규칙 발견, 반복적 혼동 사례 등

## 프로젝트 구조

- **프레임워크**: Next.js (App Router, TypeScript, Tailwind CSS)
- **패키지 매니저**: pnpm
- **주요 문서**: `Document/PRD.md` (제품 요구사항), `Document/plan.md` (개발 작업 계획)

## 기술 스택

| 계층 | 기술 |
|------|------|
| 프론트엔드 | Next.js 16+ (App Router) |
| 스타일링 | Tailwind CSS + shadcn/ui |
| 드래그앤드롭 | @dnd-kit/core |
| 상태 관리 | React Server Components + Zustand |
| 백엔드/DB | Supabase (PostgreSQL) |
| 인증 | Supabase Auth |
| LLM API | OpenAI GPT-4o-mini |
| 배포 | Vercel |

## 주의사항 (학습된 교훈)

- **Next.js API Route placeholder**: `route.ts` 파일은 반드시 HTTP 메서드 함수(`GET`, `POST` 등)를 export해야 한다. 주석만 있는 파일은 빌드 에러(`is not a module`)를 유발한다.
- **외부 API 클라이언트 동적 import 필수**: `openai` 같은 패키지는 `import` 시점에 모듈 평가가 발생하여 빌드 타임에 환경 변수 부재 에러를 유발한다. 지연 초기화(`getOpenAI()`)만으로는 부족하며, 반드시 `const { default: OpenAI } = await import("openai")` 처럼 **동적 import**를 사용해야 한다.
