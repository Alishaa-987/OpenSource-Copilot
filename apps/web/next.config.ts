import type { NextConfig } from "next";

/**
 * Normalises a backend service URL to a bare origin.
 *
 * Why this exists: the same env var names are shared with the backend
 * services, where they are configured as the API base (for example the root
 * .env sets REPOSITORY_SERVICE_URL=http://localhost:3001/api because
 * knowledge-service calls it that way). The rewrites below append "/api/..."
 * themselves, so a value that already ends in /api produces
 * http://localhost:3001/api/api/v1/github/me and every proxied request 404s.
 *
 * That only bites when the root .env is loaded into this process - which is
 * exactly what happens with `nx serve web` but not with a plain `next dev`,
 * which is why the app appeared to work or 404 depending on how it was
 * started. Stripping a trailing /api here makes both ways behave the same.
 */
function serviceOrigin(value: string | undefined, fallback: string): string {
  const raw = (value ?? "").trim() || fallback;
  return raw.replace(/\/+$/, "").replace(/\/api$/i, "");
}

const repositoryServiceUrl = serviceOrigin(process.env.REPOSITORY_SERVICE_URL, "http://localhost:3001");
const guidanceServiceUrl = serviceOrigin(process.env.GUIDANCE_SERVICE_URL, "http://localhost:3002");
const knowledgeServiceUrl = serviceOrigin(process.env.KNOWLEDGE_SERVICE_URL, "http://localhost:3003");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/repository/:path*", destination: repositoryServiceUrl + "/api/:path*" },
      { source: "/api/guidance/:path*", destination: guidanceServiceUrl + "/api/:path*" },
      { source: "/api/knowledge/:path*", destination: knowledgeServiceUrl + "/api/:path*" },
    ];
  },
};

export default nextConfig;
