// Open Library Covers API 기반 표지 URL 보강
// ISBN만 있으면 URL을 구성하므로 추가 API 호출 없이 채울 수 있다.
// 이미지가 없는 ISBN은 default=false 파라미터로 404 응답 → 클라이언트 <Image onError>가 fallback UI 처리.
import type { SearchCandidate } from "@/types";

function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, "").toUpperCase();
}

export function fillCoversFromOpenLibrary(candidates: SearchCandidate[]): void {
  for (const c of candidates) {
    if (c.coverUrl) continue;
    const isbn = normalizeIsbn(c.isbn ?? "");
    if (!isbn) continue;
    c.coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`;
  }
}
