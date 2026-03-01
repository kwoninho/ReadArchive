import type { MetadataRoute } from "next";

// robots.txt 생성
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/"],
    },
  };
}
