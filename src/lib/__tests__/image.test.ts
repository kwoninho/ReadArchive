import { describe, it, expect } from "vitest";
import { isOptimizable } from "../image";

describe("isOptimizable", () => {
  it("null/undefined/empty 문자열은 false", () => {
    expect(isOptimizable(null)).toBe(false);
    expect(isOptimizable(undefined)).toBe(false);
    expect(isOptimizable("")).toBe(false);
  });

  it("잘못된 URL은 false (throw 하지 않음)", () => {
    expect(isOptimizable("not a url")).toBe(false);
    expect(isOptimizable("://missing-protocol")).toBe(false);
  });

  it("화이트리스트 호스트는 true", () => {
    expect(isOptimizable("https://books.google.com/books?id=abc")).toBe(true);
    expect(isOptimizable("https://covers.openlibrary.org/b/isbn/1234-M.jpg")).toBe(true);
    expect(
      isOptimizable("https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9791188087488.jpg")
    ).toBe(true);
    expect(isOptimizable("https://image.aladin.co.kr/product/123/cover.jpg")).toBe(true);
    expect(isOptimizable("https://image.yes24.com/goods/00000000/XL")).toBe(true);
  });

  it("googleusercontent 서브도메인은 모두 허용", () => {
    expect(isOptimizable("https://lh3.googleusercontent.com/abc")).toBe(true);
    expect(isOptimizable("https://googleusercontent.com/x")).toBe(true);
    expect(isOptimizable("https://a.b.c.googleusercontent.com/x")).toBe(true);
  });

  it("화이트리스트 밖 호스트는 false", () => {
    expect(isOptimizable("https://example.com/cover.jpg")).toBe(false);
    expect(isOptimizable("https://picsum.photos/200")).toBe(false);
    // googleusercontent 접미가 우연히 포함된 다른 도메인은 차단
    expect(isOptimizable("https://evil-googleusercontent.com/x")).toBe(false);
  });

  it("http 프로토콜은 원칙적으로 프로젝트에서 https로만 저장되지만 호스트 기준으로만 판정", () => {
    // 호스트 기반이므로 http든 https든 동일
    expect(isOptimizable("http://books.google.com/x")).toBe(true);
  });
});
