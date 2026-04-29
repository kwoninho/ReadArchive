# ReadArchive - 개발 작업 계획 (Plan)

## 작업 규칙

- 구현 전 사용자 승인 필요
- plan.md에는 진행 전/진행 중 작업만 유지
- 완료 작업은 사용자 확인 후 `Document/History/history.md` 상단으로 이동
- 신규 기능은 반드시 해당 기능을 검증하는 테스트 포함

---

## 작업 목록

### 모바일 화면 오버플로/잘림 검수 및 수정

- 설명: 모바일 폭(360~390px) 기준으로 글이 영역 밖으로 흘러넘치거나 의도치 않게 잘리는 현상을 일괄 수정한다. 아래 문제 지점별로 우선순위를 분류했다.
- 우선순위: high (사용 흐름의 메인 경로 모두에 해당)

#### 1. `MobileBoard` 탭 네비게이션 — high
- 위치: [src/components/board/mobile-board.tsx:63-81](src/components/board/mobile-board.tsx#L63)
- 증상: `flex-1 + whitespace-nowrap`으로 4탭이 1/4 폭을 강제 점유. 책 수가 두 자리 이상이 되면 360px 화면에서 `읽고싶은(99)` 같은 라벨이 자기 칸을 비집고 옆 탭으로 비어져 나오거나 컨테이너 우측을 뚫음.
- 수정안:
  - 라벨과 카운트를 줄바꿈 가능 구조(`flex-col` 혹은 라벨/카운트 분리, `whitespace-nowrap` 제거)로 변경하거나
  - 좁은 폭에서는 `text-[11px]`로 한 단계 더 축소 + 카운트를 별도 chip으로 표시
  - 라벨 자체를 더 짧게(읽고싶은→읽을책, 멈춤 유지, 읽는중 유지, 완료 유지) 변경 검토

#### 2. `MobileBoard` 책 카드 액션 버튼 영역 — high
- 위치: [src/components/board/mobile-board.tsx:88-126](src/components/board/mobile-board.tsx#L88)
- 증상: 우측 액션 버튼(`독서 완료 ✓`, `읽다 멈춤` 등)이 `shrink-0`이라 가장 긴 라벨 폭만큼 우측을 점유. 표지(40px) + gap(12px) + 책정보 + 버튼(약 90px) 구조에서 좁은 화면이면 책 제목 영역이 거의 사라지거나 버튼이 카드 밖으로 비어져 나갈 위험.
- 수정안:
  - 액션을 카드 본문 아래 `border-t pt-2` 형태의 푸터 영역(`flex flex-row gap-2`)으로 분리해 책정보가 가로 폭을 모두 사용하게 함
  - 또는 액션을 아이콘 버튼화(▶, ⏸, ✓) + `aria-label`로 폭 압축

#### 3. `BookDetail` 제목/요약/메타 텍스트 줄바꿈 — high
- 위치: [src/components/book/book-detail.tsx:202-273](src/components/book/book-detail.tsx#L202)
- 증상:
  - `<h1>{book.title}</h1>`에 단어 분할 옵션 없음 → 영문 긴 단어/긴 ISBN/긴 단일 토큰이 들어오면 가로 폭을 뚫음.
  - 책정보 컨테이너 `flex flex-1 flex-col gap-2`에 `min-w-0` 누락 → flex 자식이 shrink되지 못하고 부모를 밀어냄.
  - 요약(`<p>{book.summary}</p>`) 동일.
- 수정안:
  - 제목/요약에 `break-words` (또는 `break-anywhere`) 적용
  - 정보 컨테이너에 `min-w-0 w-full` 추가
  - ISBN 라인은 `break-all`

#### 4. `BookEditForm` 모바일 그리드 압축 — high
- 위치: [src/components/book/book-edit-form.tsx:104-150](src/components/book/book-edit-form.tsx#L104)
- 증상: 출판년도/페이지/ISBN 3컬럼 grid가 모바일에서도 그대로 적용되어 ISBN 칸이 ~70px로 압축. placeholder/숫자 잘림.
- 수정안:
  - 저자/출판사: `grid-cols-1 sm:grid-cols-2`
  - 출판년도/페이지/ISBN: `grid-cols-2 sm:grid-cols-3` 또는 ISBN을 별도 행(`col-span-2`)으로 배치

#### 5. `NoteList` 메모 본문/메타 — high
- 위치: [src/components/book/note-list.tsx:110-118](src/components/book/note-list.tsx#L110)
- 증상:
  - `whitespace-pre-wrap`만 적용 → 줄바꿈은 유지하지만 영문 URL, 긴 토큰은 그대로 가로로 흘러 카드 우측을 뚫음.
  - 시간 + (상대시간) span이 길어지면 우측 편집/삭제 버튼과 충돌해 줄바꿈 없이 폭 초과 가능.
- 수정안:
  - 본문 `<p>`에 `break-words` (또는 `wrap-anywhere`) 추가
  - 메타 영역을 `flex-wrap gap-2` + `min-w-0`로, 시간 텍스트 컨테이너는 `min-w-0 truncate`

#### 6. `SearchResultCard` 정보 영역 — medium
- 위치: [src/components/search/search-result-card.tsx:25-71](src/components/search/search-result-card.tsx#L25)
- 증상: `flex flex-1 flex-col justify-between` 부모에 `min-w-0` 누락. 긴 책 제목/저자가 들어오면 추가 버튼을 우측으로 밀어내 모달 안에서도 가로 스크롤 발생 가능.
- 수정안:
  - 정보 컨테이너 `min-w-0` 추가
  - 제목 `truncate` 또는 `break-words line-clamp-2`
  - 저자/연도 라인 `truncate`

#### 7. `ReadingProgress` 입력 행 — medium
- 위치: [src/components/book/reading-progress.tsx:72-88](src/components/book/reading-progress.tsx#L72)
- 증상: `Input(w-28) + "/ 1234p" + 저장` 가로 배치. 4자리 페이지 + 한글 단위에서 320px 화면에 빠듯하며 `flex-wrap` 없음.
- 수정안: 부모 `flex flex-wrap items-center gap-2`로 변경 + 입력 `min-w-0 flex-1 max-w-[8rem]`

#### 8. `Header` 모바일 검색바 — low
- 위치: [src/components/layout/header.tsx:122-137](src/components/layout/header.tsx#L122)
- 증상: 현재는 `px-4 py-2 md:hidden` 적용으로 정상. 단, 검색 바 placeholder가 길어 자체 truncate가 없어도 input 자체에서 자르므로 큰 이슈 없음. 검수만 진행.

#### 9. `CategoryFilter` 칩 줄바꿈 — low
- 위치: [src/components/board/category-filter.tsx:14](src/components/board/category-filter.tsx#L14)
- 증상: `flex-wrap` 적용되어 정상이지만, 단일 카테고리 이름이 폭을 초과하면 칩 자체가 넘침.
- 수정안: 칩에 `max-w-full truncate` 또는 `break-all`

#### 10. 전역 안전망 — medium
- 위치: [src/app/globals.css](src/app/globals.css), [src/app/layout.tsx](src/app/layout.tsx)
- 수정안:
  - `body`에 `overflow-x-hidden` 추가하여 어떤 자식 컴포넌트가 가로를 뚫더라도 페이지 자체 가로 스크롤은 발생하지 않도록 함 (방어적 차단)
  - 단, 이는 근본 원인을 가리는 해결책이므로 1~9번 수정 후 추가하는 보조 장치로만 사용

#### 검증 방법
- Chrome DevTools 모바일 에뮬레이션 360 × 640 / 390 × 844에서 다음 시나리오:
  - 보드 탭(책 100권 이상), 책 카드(긴 영문 제목, 한글 단일 긴 단어 포함), 책 상세(요약 1000자 + URL 포함), 메모(URL 본문), 책 편집 폼(ISBN 13자리)
- 각 페이지에서 `document.body.scrollWidth === window.innerWidth` 검증
- 기존 컴포넌트 단위 테스트가 있는 영역(`src/components/**/__tests__`)은 className 변경에 따른 회귀가 없는지 확인. 새로운 단위 테스트는 시각 회귀 성격이라 추가하지 않고, 기존 테스트가 통과함을 확인.

---

완료 이력은 `Document/History/history.md`를 참고하세요.
