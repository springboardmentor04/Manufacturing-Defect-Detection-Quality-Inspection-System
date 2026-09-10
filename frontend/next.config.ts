/** @type {import('next').NextConfig} */
const rawBackendUrl = 
  process.env.NEXT_PUBLIC_BACKEND_URL || 
  process.env.VITE_API_URL || 
  process.env.NEXT_PUBLIC_API_URL || 
  "https://vision-ai-inspect.onrender.com";

const cleanBackendUrl = rawBackendUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "");

const nextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${cleanBackendUrl}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${cleanBackendUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
