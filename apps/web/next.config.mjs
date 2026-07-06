/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@sd-game/content', '@sd-game/game-engine', '@xyflow/react'],
  reactStrictMode: true,
};

export default nextConfig;
