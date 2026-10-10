/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cf-ipfs.com' },
      { protocol: 'https', hostname: 'ipfs.io' },
      { protocol: 'https', hostname: 'arweave.net' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com' },
      { protocol: 'https', hostname: 'pump.mypinata.cloud' },
      { protocol: 'https', hostname: 'cdn.pump.fun' },
      { protocol: 'https', hostname: 'dd.dexscreener.com' },
    ],
  },
};

export default nextConfig;
