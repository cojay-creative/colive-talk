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
    // removeConsole: process.env.NODE_ENV === 'production', // 디버깅을 위해 임시 비활성화
    removeConsole: false, // console.log를 유지하여 Whisper 디버깅 가능
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

  // Whisper.js 지원을 위한 webpack 설정
  webpack: (config, { isServer }) => {
    // 브라우저 전용 설정
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: require.resolve('buffer'),
        process: require.resolve('process/browser'),
        util: false,
        url: false,
        querystring: false,
        os: false,
        child_process: false,
        worker_threads: false,
        perf_hooks: false,
      };

      // Node.js 전용 패키지 완전 제외
      config.externals = config.externals || [];
      config.externals.push({
        'onnxruntime-node': 'commonjs onnxruntime-node',
        'onnxruntime-common': 'commonjs onnxruntime-common'
      });

      // 글로벌 변수 정의 (require 문제 해결)
      const webpack = require('webpack');
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.DefinePlugin({
          global: 'globalThis',
          'global.XENOVA_TRANSFORMERS_ENV': JSON.stringify('browser'),
        }),
        new webpack.ProvidePlugin({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer'],
        })
      );
    }

    // WASM 및 WebAssembly 지원
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // .node 파일과 네이티브 바이너리 무시
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push(
      {
        test: /\.node$/,
        use: 'ignore-loader'
      },
      {
        test: /\.(wasm)$/,
        type: 'webassembly/async',
      }
    );

    return config;
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