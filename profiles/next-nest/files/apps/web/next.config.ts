import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The image of apps/web/Dockerfile runs .next/standalone: the server and only the modules it uses.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // When the browser needs the API, the web can forward a path to it with rewrites(), so the API needs no CORS and
  // stays off the internet: API_URL is http://api:3001 on the VPS, as apps/web/Dockerfile sets it. Forward each path
  // the browser needs, never a catch-all such as /api/:path*.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
