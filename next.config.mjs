/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // CORS für alle /api/employee/* und /api/auth/* Routen
        // Erlaubt Zugriff von Expo Web (localhost:8081) und Expo Go (LAN)
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Cookie, Authorization" },
        ],
      },
    ];
  },
}

export default nextConfig
