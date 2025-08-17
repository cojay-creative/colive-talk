# 🚀 MVP 무료 버전 배포 가이드

실시간 음성 번역 서비스를 무료로 웹에 배포하는 방법입니다.

## 📋 MVP 기능 요약

✅ **포함된 기능**
- 무료 Web Speech API 음성 인식
- 무료 번역 API (MyMemory, LibreTranslate)
- 실시간 자막 오버레이
- 다국어 지원 (한국어, 영어, 일본어 등)
- 브라우저 기반 마이크 사용

❌ **제외된 기능** (향후 유료 버전)
- 특정 마이크 선택
- 고급 STT 서비스 (OpenAI, Google)
- 커스텀 마이크 디바이스 제어

## 🌐 무료 배포 옵션

### 1. **Vercel (추천) - 무료**

가장 간단하고 안정적인 방법입니다.

#### 배포 단계:
```bash
# 1. Vercel CLI 설치
npm i -g vercel

# 2. 프로젝트 빌드 테스트
npm run build

# 3. Vercel 배포
vercel

# 4. 프로덕션 배포
vercel --prod
```

#### 특징:
- ✅ 무료 (월 100GB 대역폭)
- ✅ 자동 HTTPS
- ✅ 글로벌 CDN
- ✅ 자동 빌드 & 배포
- ✅ 커스텀 도메인 지원

---

### 2. **Netlify - 무료**

정적 사이트에 최적화된 서비스입니다.

#### 배포 단계:
```bash
# 1. 빌드
npm run build

# 2. Netlify CLI로 배포
npx netlify-cli deploy --prod --dir=out
```

#### 특징:
- ✅ 무료 (월 100GB 대역폭)
- ✅ 자동 HTTPS
- ✅ 폼 처리 지원
- ✅ Git 연동 자동 배포

---

### 3. **GitHub Pages - 무료**

GitHub 저장소 기반 배포입니다.

#### 설정:
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run build
      - run: npm run export
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./out
```

---

## ⚙️ 배포 전 최적화

### 1. **Next.js 설정 수정**

`next.config.js` 수정:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 정적 사이트 생성 (Vercel/Netlify용)
  output: 'export',
  // 이미지 최적화 비활성화 (정적 배포용)
  images: {
    unoptimized: true
  },
  // 후행 슬래시 추가 (호환성)
  trailingSlash: true,
  // 기본 경로 (GitHub Pages용 - 필요시)
  // basePath: '/your-repo-name',
}

module.exports = nextConfig
```

### 2. **package.json에 빌드 스크립트 추가**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "export": "next export", 
    "start": "next start",
    "deploy": "npm run build && npm run export"
  }
}
```

### 3. **환경 변수 설정 (배포 플랫폼에서)**

```bash
# Vercel/Netlify 대시보드에서 설정
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## 🔧 성능 최적화

### 1. **번들 크기 최적화**

```bash
# 번들 분석
npm install --save-dev @next/bundle-analyzer

# next.config.js에 추가
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})
module.exports = withBundleAnalyzer(nextConfig)

# 분석 실행
ANALYZE=true npm run build
```

### 2. **이미지 최적화**

```typescript
// 이미지를 public 폴더에 WebP 형식으로 저장
// 용량 최소화를 위해 필요한 이미지만 포함
```

### 3. **폰트 최적화**

```css
/* 시스템 폰트 사용으로 로딩 속도 향상 */
body {
  font-family: system-ui, -apple-system, sans-serif;
}
```

---

## 🌍 도메인 연결

### Vercel에서 커스텀 도메인:
1. Vercel 대시보드 → 프로젝트 → Settings → Domains
2. 도메인 입력 (예: yourdomain.com)
3. DNS 설정 (A 레코드를 Vercel IP로)
4. 자동 SSL 인증서 적용

### 무료 도메인 옵션:
- **Freenom** (.tk, .ml, .ga)
- **서브도메인 사용** (yourdomain.vercel.app)

---

## 📊 모니터링 & 분석

### 1. **Google Analytics 추가**

```typescript
// app/layout.tsx
import Script from 'next/script'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <head>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'GA_MEASUREMENT_ID');
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### 2. **에러 모니터링**

Vercel은 기본적으로 에러 로그를 제공합니다.

---

## 🚀 빠른 배포 (추천 방법)

```bash
# 1. 프로젝트 클론 & 설정
git clone <your-repo>
cd <project-folder>
npm install

# 2. 빌드 테스트
npm run build

# 3. Vercel로 배포 (가장 간단)
npx vercel

# 4. 배포 완료!
# → https://your-project.vercel.app
```

---

## 💰 비용 예상

| 플랫폼 | 무료 한도 | 초과 시 비용 |
|--------|-----------|-------------|
| **Vercel** | 100GB/월 | $20/월 Pro |
| **Netlify** | 100GB/월 | $19/월 Pro |
| **GitHub Pages** | 1GB 저장소 | 완전 무료 |

**예상 사용량:**
- 일일 방문자 1,000명 = 월 약 10-20GB
- **결론: 무료 한도로 충분함**

---

## 🔧 문제 해결

### Q: Web Speech API가 작동하지 않아요
A: HTTPS가 필요합니다. 모든 추천 플랫폼은 자동 HTTPS를 제공합니다.

### Q: 마이크 권한이 거부되었어요
A: 브라우저 주소창 좌측 🔒 아이콘 → 마이크 허용

### Q: 번역이 느려요
A: 무료 API 제한입니다. 캐시를 활용하여 최적화되어 있습니다.

---

## 📈 런칭 후 할 일

1. **사용자 피드백 수집**
2. **GA 데이터로 사용 패턴 분석**
3. **에러 로그 모니터링**
4. **SEO 최적화** (meta 태그, sitemap)
5. **유료 버전 준비** (자체 STT 서버)

---

**🎉 5분 만에 배포 완료!**

가장 빠른 방법: `npx vercel` 명령 하나로 즉시 배포 가능합니다.