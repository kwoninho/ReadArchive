# 프로젝트 공통 에이전트 지침

> 이 파일은 AI 에이전트(Claude, Copilot, Cursor 등)가 공통으로 따라야 할 프로젝트 규칙을 정의한다.

## 참고 문서

- `Document/setup.md`: 환경 구성 및 기술 스택
- `Document/PRD.md`: 제품 요구사항
- `Document/plan.md`: 미구현 작업 명세

## 언어 규칙

- **코드 작성, 추론 과정**: 영어 사용
- **주석, 문서, 커밋 메시지**: 한국어로 작성

## 워크플로우 규칙
- 단순 버그 수정이 아닌 기능 추가나 변경은 코드를 수정하기 전에 반드시 plan.md에 작업 명세를 작성하고 승인 후에 작업을 진행한다.
- 신규 기능은 반드시 해당 기능을 검증하는 테스트를 포함해서 작성한다.
- 각 작업(태스크)이 완료될 때마다 자동으로 git commit을 수행한다.
- 기존 실패 테스트를 사용자의 명시적 승인 없이 삭제하거나 수정하지 않는다.
- 작업 중 실수, 모호한 판단, 또는 이후 동일 실수를 방지할 지침이 필요한 경우 이 파일(`AGENTS.md`)에 해당 내용을 추가한다.
  - 예: 잘못된 컨벤션 적용, 누락된 규칙 발견, 반복적 혼동 사례 등

## plan 관리 규칙

### 파일 구조
- `Document/plan.md`: 미구현 작업 명세
- `Document/History/history.md`: 완료된 작업 이력

### plan.md task 형식
```
### [Task 제목]
- 설명: (구현할 기능)
- 우선순위: high / medium / low
```

### 완료 처리
- 사용자 확인 후 완료 처리 (Agent 임의 처리 금지)
- 완료된 task는 plan.md에서 제거 → history.md 상단에 추가:
```
### [Task 제목] - YYYY-MM-DD
- 완료 내용 요약
```

## 주의사항 (학습된 교훈)

- **Next.js API Route placeholder**: `route.ts` 파일은 반드시 HTTP 메서드 함수(`GET`, `POST` 등)를 export해야 한다. 주석만 있는 파일은 빌드 에러(`is not a module`)를 유발한다.
- **외부 API 클라이언트 초기화 주의**: 일부 패키지(`openai` 등)는 `import` 시점에 환경 변수를 평가하여 빌드 타임 에러를 유발한다. 이 경우 동적 import(`await import(...)`)를 사용한다. 현재 사용 중인 `@google/generative-ai`는 정적 import + 지연 초기화(싱글턴 패턴)로 충분하다.
