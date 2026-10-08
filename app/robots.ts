import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://collabspace.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/login",
          "/signup",
          "/privacy",
          "/terms",
          "/contact",
          "/thank-you",
        ],
        disallow: [
          "/api/",
          "/preferences",
          "/settings",
          "/projects/*",
          "/tasks",
          "/calendar",
          "/messages",
          "/reports",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
