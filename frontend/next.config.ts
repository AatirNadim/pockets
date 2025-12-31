import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  allowedDevOrigins: [
    "lucious.local", // for testing on local network (set according to the caddyfile)
    "http://localhost:3000",
  ],
  experimental: {
    // optimizePackageImports: [
    //   "lucide-react",
    //   "framer-motion",
    //   "@radix-ui/react-dropdown-menu",
    //   "@radix-ui/react-dialog",
    //   "@radix-ui/react-scroll-area",
    // ],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },
};

export default nextConfig;
