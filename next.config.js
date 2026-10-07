/** @type {import('next').NextConfig} */
const nextConfig = {
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

module.exports = nextConfig;
