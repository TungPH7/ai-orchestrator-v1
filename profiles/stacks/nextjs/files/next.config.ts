import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The image of apps/__APP__/Dockerfile runs .next/standalone: the server and only the modules it uses.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // When the browser needs the API, the app can forward a path to it with rewrites(), so the API needs no CORS and
  // stays off the internet. next build writes the rewrites into the build, so set API_URL to http://api:<port> in
  // apps/__APP__/Dockerfile: the same in every environment. Forward each path the browser needs, never a catch-all such
  // as /api/:path*.
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
