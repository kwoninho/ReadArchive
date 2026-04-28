# ReadArchive - 개발 작업 계획 (Plan)

## 작업 규칙

- 구현 전 사용자 승인 필요
- plan.md에는 진행 전/진행 중 작업만 유지
- 완료 작업은 사용자 확인 후 `Document/History/history.md` 상단으로 이동
- 신규 기능은 반드시 해당 기능을 검증하는 테스트 포함

---

## 작업 목록

### 독서 상태에 '읽다 멈춤' 추가
- 설명: 기존 독서 상태 `WANT_TO_READ`, `READING`, `FINISHED`에 새 상태 `PAUSED`(표시명: 읽다 멈춤)를 추가한다. 공통 타입(`BOOK_STATUSES`, `BookStatus`), API 상태 검증, Supabase `books.status` CHECK 제약/마이그레이션, 데스크톱 칸반 4컬럼 표시, 모바일 탭 및 상태 이동 버튼, 상세 화면 상태 선택 옵션을 함께 수정한다. `READING` 전환 시 시작일 자동 설정과 `FINISHED` 전환 시 완료일/현재 페이지 자동 동기화는 기존 동작을 유지하고, `PAUSED` 전환은 별도 완료일을 설정하지 않는다. 신규 상태가 유효성 검증과 상태별 필터링/이동 UI에서 정상 동작하는 테스트를 추가 또는 보강한다.
- 우선순위: high

---

완료 이력은 `Document/History/history.md`를 참고하세요.
