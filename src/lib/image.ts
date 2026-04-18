// next.config.ts images.remotePatterns 와 동기 유지.
// 화이트리스트 밖 URL은 Image 컴포넌트에서 unoptimized={true}로 렌더해
// "Invalid src prop" 런타임 에러를 회피한다.
const OPTIMIZABLE_HOSTS: ReadonlySet<string> = new Set([
  "books.google.com",
  "books.google.co.kr",
  "covers.openlibrary.org",
  "contents.kyobobook.co.kr",
  "image.aladin.co.kr",
  "image.yes24.com",
  "shopping-phinf.pstatic.net",
  "search1.kakaocdn.net",
]);

export function isOptimizable(url: string | null | undefined): boolean {
  if (!url) return false;
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return false;
  }
  if (OPTIMIZABLE_HOSTS.has(hostname)) return true;
  // **.googleusercontent.com 서브도메인 허용 (Google Books 썸네일 리다이렉트)
  if (hostname === "googleusercontent.com" || hostname.endsWith(".googleusercontent.com")) {
    return true;
  }
  return false;
}
