import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only the Docker image needs the self-contained server; Vercel and `next start` use the normal output.
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  // Bundling and minifying pdf.js breaks its class inheritance ("Super constructor null"),
  // so unpdf is loaded from node_modules at runtime instead.
  serverExternalPackages: ["unpdf"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/a/**",
      },
    ],
  },
  // The quiz pages used to live under the misspelled /quizz; keep old links and bookmarks working.
  async redirects() {
    return [
      { source: "/quizz", destination: "/quizzes/sample", permanent: true },
      { source: "/quizz/new", destination: "/quizzes/new", permanent: true },
      { source: "/quizz/:quizId", destination: "/quizzes/:quizId", permanent: true },
    ];
  },
};

export default nextConfig;
