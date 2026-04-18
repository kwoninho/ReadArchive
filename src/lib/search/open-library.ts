// Open Library Covers API 기반 표지 URL 보강
// ISBN만 있으면 URL을 구성하므로 추가 API 호출 없이 채울 수 있다.
// 이미지가 없는 ISBN은 default=false 파라미터로 404 응답 → 클라이언트 <Image onError>가 fallback UI 처리.
import type { SearchCandidate } from "@/types";

function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, "").toUpperCase();
}

// Open Library Covers API는 ISBN-10(10자) 또는 ISBN-13(13자)만 유효하다.
// 그 외 길이는 항상 404이므로 불필요한 요청을 막기 위해 URL을 생성하지 않는다.
function isValidIsbnLength(isbn: string): boolean {
  return isbn.length === 10 || isbn.length === 13;
}

export function fillCoversFromOpenLibrary(candidates: SearchCandidate[]): void {
  for (const c of candidates) {
    if (c.coverUrl) continue;
    const isbn = normalizeIsbn(c.isbn ?? "");
    if (!isValidIsbnLength(isbn)) continue;
    c.coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`;
  }
}
