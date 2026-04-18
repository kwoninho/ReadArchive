// 네이버 책 검색 API (한국 서점 데이터 통합)
// 일 25,000건 무료. 환경변수 누락/오류 시 빈 배열 반환(fail-open).
import type { SearchCandidate } from "@/types";

const NAVER_BOOK_ENDPOINT = "https://openapi.naver.com/v1/search/book.json";
const SEARCH_TIMEOUT_MS = 6000;
const MAX_RESULTS = 10;

interface NaverBookItem {
  title?: unknown;
  link?: unknown;
  image?: unknown;
  author?: unknown;
  discount?: unknown;
  publisher?: unknown;
  pubdate?: unknown;
  isbn?: unknown;
  description?: unknown;
}

interface NaverBookResponse {
  total?: number;
  start?: number;
  display?: number;
  items?: NaverBookItem[];
}

// 네이버 응답은 하이라이트 <b>, </b> 를 포함하므로 제거
function stripHighlightTags(v: string): string {
  return v.replace(/<\/?b>/gi, "");
}

// 타입이 뒤틀려 들어와도 안전하게 string 추출
function toStr(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function toInt(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

// 네이버 pubdate는 "YYYYMMDD" 또는 "YYYY" 형식
function extractYear(pubdate: unknown): number {
  const s = toStr(pubdate).trim();
  if (s.length < 4) return 0;
  const year = parseInt(s.slice(0, 4), 10);
  if (Number.isNaN(year) || year < 1000 || year > 9999) return 0;
  return year;
}

// author는 "A^B^C" 캐럿 구분자
function normalizeAuthor(raw: unknown): string {
  const s = stripHighlightTags(toStr(raw));
  if (!s) return "";
  return s
    .split("^")
    .map((a) => a.trim())
    .filter(Boolean)
    .join(", ");
}

// isbn은 "ISBN10 ISBN13" 공백 구분. 13자리 우선, 없으면 10자리.
function pickIsbn(raw: unknown): string {
  const s = toStr(raw).trim();
  if (!s) return "";
  const parts = s.split(/\s+/).filter(Boolean);
  const isbn13 = parts.find((p) => p.length === 13);
  if (isbn13) return isbn13;
  const isbn10 = parts.find((p) => p.length === 10);
  if (isbn10) return isbn10;
  return parts[0] ?? "";
}

function normalizeItem(item: NaverBookItem): SearchCandidate {
  const summary = stripHighlightTags(toStr(item.description)).trim();
  return {
    title: stripHighlightTags(toStr(item.title)).trim(),
    author: normalizeAuthor(item.author),
    publisher: stripHighlightTags(toStr(item.publisher)).trim(),
    publishedYear: extractYear(item.pubdate),
    isbn: pickIsbn(item.isbn),
    pageCount: 0, // 네이버 응답엔 pageCount 없음
    summary: summary.length > 200 ? summary.slice(0, 200) : summary,
    category: "",
    coverUrl: toStr(item.image) || null,
  };
}

export async function searchBooksWithNaver(
  query: string
): Promise<SearchCandidate[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.warn("[naver] NAVER_CLIENT_ID/SECRET 미설정 — 스킵");
    return [];
  }

  const params = new URLSearchParams({
    query,
    display: String(MAX_RESULTS),
    sort: "sim",
  });
  const url = `${NAVER_BOOK_ENDPOINT}?${params}`;

  try {
    const response = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`[naver] HTTP ${response.status}`);
      return [];
    }
    const data: NaverBookResponse = await response.json();
    if (!Array.isArray(data.items) || data.items.length === 0) return [];

    return data.items
      .map(normalizeItem)
      .filter((c) => c.title.length > 0);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[naver] fetch error:", msg);
    return [];
  }
}
