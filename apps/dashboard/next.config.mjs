/** @type {import("next").NextConfig} */
const nextConfig = {
  // Linting runs once for the whole monorepo via the root `pnpm lint` (eslint.config.mjs),
  // so `next build` should not lint again (Next 16 drops build-time linting anyway).
  eslint: { ignoreDuringBuilds: true },
}

export default nextConfig
