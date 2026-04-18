// 날짜/시간 포맷 공용 유틸

/** KST 기준 절대 시간 포맷: "YYYY-MM-DD HH:mm" */
export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  const hours = String(kst.getUTCHours()).padStart(2, "0");
  const minutes = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/** KST 기준 날짜 포맷: "YYYY. M. D." (TZ 고정 — SSR/CSR 하이드레이션 안전) */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;
  const day = kst.getUTCDate();
  return `${year}. ${month}. ${day}.`;
}

/** 상대 시간 표시: "방금 전", "5분 전", "3시간 전", "7일 전" 등
 *  주의: Date.now()에 의존하므로 SSR 출력이 CSR과 다를 수 있음.
 *  호출 측은 마운트 이후(useEffect 내부)에서만 렌더하거나 suppressHydrationWarning 사용. */
export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return formatDate(dateStr);
}
