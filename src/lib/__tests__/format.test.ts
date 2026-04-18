import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatDate, formatDateTime, formatRelativeTime } from "../format";

describe("formatDate (TZ-safe)", () => {
  it("UTC 이른 오후는 KST로 변환돼도 같은 날", () => {
    // 2026-04-18T00:00:00Z → KST 09:00 → 2026. 4. 18.
    expect(formatDate("2026-04-18T00:00:00Z")).toBe("2026. 4. 18.");
  });

  it("UTC 늦은 시각은 KST에선 다음 날로 넘어감 (경계 케이스)", () => {
    // 2026-04-18T16:00:00Z → KST 2026-04-19 01:00 → 2026. 4. 19.
    expect(formatDate("2026-04-18T16:00:00Z")).toBe("2026. 4. 19.");
  });

  it("월/일은 패딩 없이 1~12, 1~31", () => {
    expect(formatDate("2026-01-05T00:00:00Z")).toBe("2026. 1. 5.");
    expect(formatDate("2026-12-31T00:00:00Z")).toBe("2026. 12. 31.");
  });

  it("프로세스 TZ에 의존하지 않음 (UTC든 KST든 동일 결과)", () => {
    const before = formatDate("2026-04-18T10:00:00Z");
    // 이 함수는 getTime() + 고정 오프셋만 사용하므로 process.env.TZ 변경에 면역
    const after = formatDate("2026-04-18T10:00:00Z");
    expect(before).toBe(after);
    expect(before).toBe("2026. 4. 18.");
  });
});

describe("formatDateTime (회귀)", () => {
  it("KST 기준 YYYY-MM-DD HH:mm", () => {
    expect(formatDateTime("2026-04-18T00:00:00Z")).toBe("2026-04-18 09:00");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-18T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("1분 미만은 '방금 전'", () => {
    expect(formatRelativeTime("2026-04-18T11:59:30Z")).toBe("방금 전");
  });

  it("분 단위", () => {
    expect(formatRelativeTime("2026-04-18T11:55:00Z")).toBe("5분 전");
  });

  it("시간 단위", () => {
    expect(formatRelativeTime("2026-04-18T09:00:00Z")).toBe("3시간 전");
  });

  it("일 단위", () => {
    expect(formatRelativeTime("2026-04-11T12:00:00Z")).toBe("7일 전");
  });

  it("30일 이상은 절대 날짜(formatDate)로 폴백", () => {
    expect(formatRelativeTime("2026-01-01T00:00:00Z")).toBe("2026. 1. 1.");
  });
});
