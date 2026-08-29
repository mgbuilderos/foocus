import type { MetadataRoute } from "next";
import { SITE_URL } from "./_lib/site";

/** One public route. `/admin` is private and is excluded on purpose. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
