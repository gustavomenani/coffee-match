import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin Turbopack root so multi-lockfile workspaces don't warn/pick the wrong root.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
