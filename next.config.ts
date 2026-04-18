import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  watchOptions: {
    pollIntervalMs: 1000,
  },
  images: {
    // 책 표지 이미지 소스:
    // - 자동 검색: Google Books(썸네일), Open Library Covers
    // - 일부 Google Books 썸네일은 googleusercontent 도메인에서 서빙됨
    // - 수동 입력(book-edit-form)으로 국내 서점 직링크도 저장됨
    remotePatterns: [
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "https", hostname: "books.google.co.kr" },
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "contents.kyobobook.co.kr" },
      { protocol: "https", hostname: "image.aladin.co.kr" },
      { protocol: "https", hostname: "image.yes24.com" },
      { protocol: "https", hostname: "shopping-phinf.pstatic.net" },
      { protocol: "https", hostname: "search1.kakaocdn.net" },
    ],
  },
};

export default nextConfig;
