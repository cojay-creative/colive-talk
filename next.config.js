/** @type {import('next').NextConfig} */
const nextConfig = {
  // MVP 무료 버전 - 최적화된 배포 설정
  
  // 성능 최적화
  swcMinify: true,
  
  // 이미지 최적화 (정적 배포용)
  images: {
    unoptimized: true
  },
  
  // 개발 품질 향상: TypeScript와 ESLint 활성화
  typescript: {
    // 개발 중에는 오류를 표시하고, 빌드 시에만 무시
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  eslint: {
    // 개발 중에는 오류를 표시하고, 빌드 시에만 무시
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // 출력 설정 (필요시 정적 사이트로 변경)
  // output: 'export', // GitHub Pages용 - 필요시 주석 해제
  
  // 후행 슬래시 (호환성)
  trailingSlash: true,
  
  // Vercel 최적화
  poweredByHeader: false,
  
  // 실험적 기능 (성능 향상)
  experimental: {
    optimizePackageImports: ['react', 'react-dom'],
    serverComponentsExternalPackages: []
  },
  
  // 캐싱 최적화
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  // OBS Browser Source 호환성을 위한 헤더 설정
  async headers() {
    return [
      {
        // 오버레이 페이지만 iframe 허용
        source: '/overlay/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL', // OBS Browser Source 허용
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' *;", // 모든 도메인에서 iframe 허용
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // CORS 허용
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type',
          },
        ],
      },
      {
        // API 엔드포인트도 CORS 허용
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods', 
            value: 'GET, POST, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig