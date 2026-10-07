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
};

module.exports = nextConfig;
