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
  }
}

module.exports = nextConfig