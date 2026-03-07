# ReadArchive - 개발 작업 계획 (Plan)

> **문서 버전**: v1.0
> **작성일**: 2026-03-01
> **기반 문서**: PRD v1.0

---

## 작업 규칙

- 각 Task는 독립적으로 완료 가능한 최소 단위
- Task ID 형식: `T-{Phase}.{순번}` (예: T-1.01)
- 의존성이 있는 Task는 `depends` 필드에 명시
- 완료된 Task는 `Document/History/history.md`로 이동

---

## 미구현 작업

### [T-8.01] 도서 카테고리 별도 테이블 분리
- 설명: `books.category` 컬럼을 `categories` / `book_categories` 구조로 분리하고, API/SSR 조회 경로, store 매핑, 카테고리 정규화 로직을 반영한다.
- 우선순위: high
