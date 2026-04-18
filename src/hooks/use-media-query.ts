"use client";

import { useCallback, useSyncExternalStore } from "react";

// useSyncExternalStore 기반 SSR-safe 구현.
// 서버 snapshot은 항상 false(모바일 가정) → CSR 첫 렌더에서도 동일하게 시작해
// hydration mismatch 없이 마운트 후 실제 값으로 전환된다.
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined") return () => {};
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query]
  );

  const getSnapshot = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  };

  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
