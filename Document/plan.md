# ReadArchive - 개발 작업 계획 (Plan)

## 작업 규칙

- 구현 전 사용자 승인 필요
- plan.md에는 진행 전/진행 중 작업만 유지
- 완료 작업은 사용자 확인 후 `Document/History/history.md` 상단으로 이동
- 신규 기능은 반드시 해당 기능을 검증하는 테스트 포함

---

## 작업 목록

### 권장 구현 순서

1. 공통 정책/유틸 정리: `T-10.00` → `T-10.19` → `T-10.17`
2. DB/타입 기반 준비: `T-10.03` → `T-10.04` → `T-10.05`
3. 책 PATCH API 1차 정비: `T-10.06` → `T-10.10` → `T-10.18`
4. API 검증 보강: `T-10.07` → `T-10.11`
5. 메모 날짜 표시: `T-10.01` → `T-10.02`
6. 읽기 진행률 UI: `T-10.08` → `T-10.09`
7. 편집 폼 구현: `T-10.12` → `T-10.13`
8. 상세 페이지 통합 안정화: `T-10.14` → `T-10.16` → `T-10.15`

> 원칙: 공용 규칙과 유틸을 먼저 고정하고, 같은 파일을 반복 수정하는 API 작업은 한 번에 묶고, 마지막에 `BookDetail` 통합과 동시성 정리를 수행한다.

### [T-10.00 정책 확정 및 검증 기준 정리]
- 설명: Phase 10 구현 전에 아래 기준을 확정한다. `currentPage`는 `number | null`로 저장하고, `pageCount`가 있을 때는 `0 <= currentPage <= pageCount`만 허용한다. `pageCount`가 없으면 현재 페이지는 저장 가능하지만 퍼센트와 완료율 바는 숨기고 안내 문구만 표시한다. 상태가 `FINISHED`로 바뀔 때 `pageCount`가 있으면 `currentPage`를 `pageCount`로 자동 동기화하고, `pageCount`가 없으면 기존 `currentPage`를 유지한다. 같은 요청에 `status: "FINISHED"`와 `currentPage: null`이 함께 오면 완료 상태 우선으로 처리해 `pageCount`가 있을 때 `currentPage = pageCount`를 적용한다. `READING` 이외 상태로 바뀌어도 `currentPage` 값은 유지한다. 편집 API는 `title`을 trim 후 필수값으로 검증하고, 선택 문자열 필드(`author`, `publisher`, `isbn`, `summary`, `coverUrl`)는 trim 후 빈 문자열이면 `null`로 저장한다. 숫자 필드는 `publishedYear`는 1 이상의 정수 또는 `null`, `pageCount`는 1 이상의 정수 또는 `null`, `currentPage`는 0 이상의 정수 또는 `null`만 허용한다. 메모 시간 표시는 KST 기준 절대 시간(`YYYY-MM-DD HH:mm`)을 기본으로 보여주고, 필요 시 상대 시간을 보조 텍스트로 병행한다.
- 우선순위: high

### [T-10.01 메모 작성 날짜 표시 적용]
- 설명: `src/components/book/note-list.tsx`에 메모 작성 시각 표시를 추가한다. KST 기준 `"YYYY-MM-DD HH:mm"` 절대 시간을 기본으로 보여주고, 상대 시간은 보조 표기로 병행한다.
- 우선순위: medium

### [T-10.02 메모 작성 날짜 표시 테스트 추가]
- 설명: `src/components/book/__tests__/note-list.test.tsx`에 메모 목록에서 작성 날짜가 의도한 형식으로 렌더링되는지 검증하는 테스트를 추가한다. 상대 시간 병행 여부가 확정되면 해당 출력도 함께 검증한다.
- 우선순위: medium

### [T-10.03 DB 마이그레이션 - current_page 컬럼 추가]
- 설명: `supabase/migrations/002_current_page.sql`과 `supabase/schema.sql`에 `books.current_page` 컬럼을 추가한다. nullable 컬럼으로 정의하고, 기존 데이터와 충돌 없이 적용 가능해야 한다.
- 우선순위: high

### [T-10.04 타입 및 매핑 업데이트]
- 설명: `src/types/index.ts`의 `Book` 타입에 `currentPage: number | null`을 추가하고, `src/stores/book-store.ts`의 `mapBookFromDB()`가 `current_page`를 `currentPage`로 정확히 매핑하도록 수정한다.
- 우선순위: high

### [T-10.05 타입 및 매핑 테스트 보강]
- 설명: `src/stores/__tests__/book-store.test.ts`에 `current_page` 매핑 케이스와 nullable 처리 케이스를 추가한다. 같은 파일의 `makeBook()` 헬퍼와 `mapBookFromDB` 테스트의 row 객체에도 `currentPage`/`current_page` 필드를 추가한다. `src/components/book/__tests__/book-detail.test.tsx`의 `makeRawBook()` 헬퍼도 새 필드를 반영하도록 업데이트한다.
- 우선순위: high

### [T-10.06 PATCH API - currentPage 지원]
- 설명: `src/app/api/books/[id]/route.ts`에 `currentPage` 업데이트를 추가한다. `currentPage`는 0 이상의 정수 또는 `null`만 허용하고, `pageCount`가 존재할 때는 이를 초과하지 못하도록 검증한다. `currentPage`와 `pageCount`가 동시에 전송되면 새 `pageCount` 기준으로 검증한다. 상태가 `FINISHED`로 변경되고 `pageCount`가 있으면 `currentPage`를 `pageCount`로 자동 보정한다. 기존 책 조회 쿼리를 `.select("id")` → `.select("id, current_page, page_count")`로 확장하여 자동 보정에 필요한 기존 값을 확보한다. `src/stores/book-store.ts`의 `moveBook()`에도 동일한 FINISHED 자동 동기화 로직을 추가한다 (낙관적 업데이트 정합성 유지).
- 우선순위: high

### [T-10.07 PATCH API - currentPage 테스트 추가]
- 설명: `src/app/api/books/[id]/__tests__/route.test.ts`에 PATCH 라우트 테스트를 추가해 `currentPage` 정상 업데이트, 유효하지 않은 값 거부, 상태/페이지 수 연계 규칙을 검증한다. `moveBook()`의 FINISHED 자동 동기화도 `src/stores/__tests__/book-store.test.ts`에서 검증한다.
- 우선순위: high

### [T-10.08 ReadingProgress 컴포넌트 구현]
- 설명: `src/components/book/reading-progress.tsx`를 추가하고 `src/components/book/book-detail.tsx`에 통합한다. `status === "READING"`일 때만 노출하며, 현재 페이지 입력과 명시적 저장 버튼 기반 저장 핸들러를 제공한다. `pageCount`가 있으면 진행률 바와 백분율을 표시하고, 없으면 진행률 계산 불가 안내 문구와 현재 페이지 값만 표시한다.
- 우선순위: high

### [T-10.09 ReadingProgress 및 상세 페이지 통합 테스트 추가]
- 설명: 읽는 중 상태에서만 진행률 UI가 노출되는지, 입력 후 PATCH 호출이 수행되는지, `pageCount` 유무에 따라 올바른 UI가 렌더링되는지 검증하는 컴포넌트 테스트를 추가한다.
- 우선순위: high

### [T-10.10 PATCH API - 메타데이터 필드 지원]
- 설명: `src/app/api/books/[id]/route.ts`에 `title`, `author`, `publisher`, `publishedYear`, `isbn`, `pageCount`, `summary`, `coverUrl`, `categoryIds` 업데이트를 지원한다. `title`은 trim 후 비어 있으면 400을 반환한다. 선택 문자열 필드는 trim 후 빈 문자열이면 `null`로 저장하고, 숫자 필드는 정책에 맞는 정수만 허용한다. `pageCount`가 변경될 때 기존 `currentPage > 새 pageCount`이면 `currentPage`를 `새 pageCount`로 자동 보정한다. `pageCount`를 `null`로 변경해도 기존 `currentPage`는 유지한다 (UI에서 프로그레스 바만 숨김). `categoryIds`는 기존 전체 교체 방식을 유지한다. T-10.06에서 확장한 기존 책 조회 쿼리(`.select("id, current_page, page_count")`)를 활용한다.
- 우선순위: high

### [T-10.11 PATCH API - 메타데이터 테스트 추가]
- 설명: `src/app/api/books/[id]/__tests__/route.test.ts`에 제목 검증, 숫자 필드 검증, 빈 문자열 정규화, `categoryIds` 갱신, 잘못된 카테고리 거부, `pageCount` 변경 시 `currentPage` 자동 보정을 검증하는 테스트를 추가한다.
- 우선순위: high

### [T-10.12 BookEditForm 컴포넌트 구현]
- 설명: `src/components/book/book-edit-form.tsx`를 추가한다. 표지 URL, 제목, 저자, 출판사, 출판년도, ISBN, 페이지 수, 요약, 카테고리 토글 UI를 제공하고, 저장 시 변경된 필드만 추려 API에 전달한다. 사용자가 값을 비운 선택 필드는 누락하지 않고 `null`로 명시 전달해 삭제 의도를 보존한다.
- 우선순위: high

### [T-10.13 BookEditForm 테스트 추가]
- 설명: 필수값 검증, 초기값 표시, 변경 필드만 제출, 카테고리 토글, 값 비우기 처리 등을 검증하는 테스트를 추가한다.
- 우선순위: high

### [T-10.14 BookDetail 편집 모드 통합]
- 설명: `src/components/book/book-detail.tsx`에 수정 버튼과 `isEditing` 상태를 추가해 정보 섹션과 `BookEditForm` 사이를 전환한다. 편집 중에는 수정/삭제 버튼을 숨기고 메모 섹션은 유지한다.
- 우선순위: high

### [T-10.15 BookDetail 편집 모드 테스트 추가]
- 설명: 수정 버튼 노출, 편집 모드 진입/종료, 편집 중 액션 버튼 숨김, 저장 후 상세 정보 반영을 검증하는 테스트를 추가한다.
- 우선순위: high

### [T-10.16 상세 페이지 mutation 직렬화 정리]
- 설명: `src/components/book/book-detail.tsx`에서 상태 변경, 별점 변경, 진행률 저장, 편집 저장이 동시에 겹치지 않도록 mutation 직렬화 또는 공통 pending 상태 관리를 도입한다. 응답 순서가 뒤바뀌어 최신 로컬 상태가 오래된 응답으로 덮어써지는 문제를 방지한다.
- 우선순위: high

### [T-10.17 책 입력 정규화 로직 공용화]
- 설명: `src/app/api/books/route.ts`와 `src/app/api/books/[id]/route.ts`에서 제목 trim, 선택 문자열 `null` 정규화, 숫자 필드 검증을 공용 함수로 추출해 생성/수정 규칙 불일치를 제거한다. 검색 결과 등록과 수동 등록도 동일 규칙을 따르도록 맞춘다.
- 우선순위: high

### [T-10.18 카테고리 갱신 실패 복구 보강]
- 설명: `src/app/api/books/[id]/route.ts`의 `categoryIds` 전체 교체 로직에서 delete 이후 insert 실패 시 카테고리 유실이 발생하지 않도록 복구 로직 또는 원자적 처리 방안을 적용한다.
- 우선순위: high

### [T-10.19 날짜/시간 포맷 유틸 공용화]
- 설명: 메모 작성 시각, 시작일, 완료일 표시에 사용할 날짜/시간 포맷 함수를 공용 유틸로 분리해 KST 기준과 출력 형식을 일관되게 유지한다.
- 우선순위: medium

---

완료 이력은 `Document/History/history.md`를 참고하세요.
