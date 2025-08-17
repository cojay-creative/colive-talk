# 🎤 Colive Talk - 실시간 자막 번역 서비스

> **AI 기반 실시간 음성 인식 및 다국어 자막 번역 서비스**

[![Next.js](https://img.shields.io/badge/Next.js-14.2.31-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3.1-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC)](https://tailwindcss.com/)

## ✨ 주요 기능

### 🎯 **핵심 기능**
- **실시간 음성 인식**: Web Speech API를 활용한 정확한 한국어 음성 인식
- **AI 번역**: 다국어 지원 (한국어, 영어, 일본어, 중국어, 스페인어 등)
- **실시간 자막**: OBS, Streamlabs 등 송출프로그램과 즉시 연동
- **자동 동기화**: 여러 창에서 실시간 설정 동기화

### 🎨 **사용자 경험**
- **직관적 UI**: 다크모드 지원, 반응형 디자인
- **실시간 미리보기**: 자막이 어떻게 보일지 즉시 확인
- **키보드 단축키**: 스페이스바로 음성 인식 토글
- **자동 자막 숨김**: 설정 가능한 자동 숨김 타이머

### 🔧 **고급 설정**
- **레이아웃 커스터마이징**: 위치, 크기, 여백, 폰트 등 완전 제어
- **폰트 설정**: 한국어 최적화 폰트 (Noto Sans KR, Malgun Gothic 등)
- **색상 테마**: 배경색, 텍스트 색상, 투명도, 그라데이션 효과
- **송출프로그램 연동**: OBS Studio, Streamlabs OBS, XSplit 등

## 🚀 빠른 시작

### 필수 요구사항
- Node.js 18.0.0 이상
- npm 8.0.0 이상
- 마이크 권한이 있는 브라우저

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/your-username/colive-talk.git
cd colive-talk

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 브라우저에서 http://localhost:3000 열기
```

### 프로덕션 빌드

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

## 📱 사용법

### 1. 음성 인식 시작
- 메인 화면에서 **🎤 인식 시작** 버튼 클릭
- 마이크 권한 허용
- 한국어로 말하기 시작

### 2. 자막 설정
- **레이아웃 설정** 탭에서 자막 위치, 크기 조정
- **폰트 설정** 탭에서 한국어 최적화 폰트 선택
- **배경 설정** 탭에서 색상 및 투명도 조정

### 3. 송출프로그램 연동
- **송출프로그램 연동** 탭에서 OBS URL 복사
- OBS Studio에서 **소스 추가** → **브라우저** 선택
- URL 필드에 복사한 주소 입력

## 🏗️ 프로젝트 구조

```
src/
├── app/                    # Next.js 14 App Router
│   ├── api/               # API 엔드포인트
│   ├── layout.tsx         # 루트 레이아웃
│   ├── page.tsx           # 메인 페이지
│   ├── overlay/           # OBS 오버레이 페이지
│   └── subtitle/          # 자막 전용 페이지
├── components/             # 재사용 가능한 컴포넌트
│   ├── Header.tsx         # 헤더 컴포넌트
│   ├── Sidebar.tsx        # 사이드바 컴포넌트
│   ├── ErrorBoundary.tsx  # 에러 바운더리
│   └── overlay/           # 오버레이 관련 컴포넌트
├── lib/                    # 유틸리티 및 서비스
│   ├── speech.ts          # 음성 인식 서비스
│   ├── translate.ts       # 번역 서비스
│   ├── sync.ts            # 동기화 서비스
│   ├── utils.ts           # 공통 유틸리티
│   └── theme.tsx          # 테마 관리
└── types/                  # TypeScript 타입 정의
    └── speech.d.ts        # 음성 관련 타입
```

## 🔧 기술 스택

### **프론트엔드**
- **Next.js 14**: App Router, 서버 컴포넌트, 최적화
- **React 18**: Concurrent Features, Suspense
- **TypeScript 5.6**: 타입 안전성, 최신 ES 기능
- **Tailwind CSS 3.4**: 유틸리티 우선 CSS 프레임워크

### **음성 및 번역**
- **Web Speech API**: 브라우저 기본 음성 인식
- **LibreTranslate**: 무료 오픈소스 번역 API
- **폴백 시스템**: API 제한 시 자동 대체 서비스

### **배포 및 호스팅**
- **Vercel**: Next.js 최적화 호스팅
- **GitHub Pages**: 정적 사이트 배포 지원
- **Docker**: 컨테이너화 지원

## 🌐 지원 언어

### **음성 인식 (입력)**
- 🇰🇷 한국어 (ko-KR)
- 🇺🇸 영어 (en-US)
- 🇯🇵 일본어 (ja-JP)
- 🇨🇳 중국어 (zh-CN)
- 🇪🇸 스페인어 (es-ES)

### **번역 (출력)**
- 🇰🇷 한국어, 🇺🇸 영어, 🇯🇵 일본어
- 🇨🇳 중국어, 🇪🇸 스페인어, 🇫🇷 프랑스어
- 🇩🇪 독일어, 🇷🇺 러시아어

## 📊 성능 최적화

### **빌드 최적화**
- SWC 컴파일러로 빠른 빌드
- CSS 최적화 및 압축
- 번들 분석 및 코드 분할

### **런타임 최적화**
- React 18 Concurrent Features
- 메모이제이션 및 최적화된 리렌더링
- 지연 로딩 및 Suspense

### **번역 최적화**
- 텍스트 청킹으로 긴 문장 처리
- 번역 결과 캐싱
- API 제한 자동 처리

## 🚀 배포

### Vercel 배포 (권장)
```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel --prod
```

### 정적 사이트 배포
```bash
# 정적 빌드
npm run export

# dist 폴더를 웹 서버에 업로드
```

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙏 감사의 말

- **Anthropic**: Claude AI 기술 지원
- **Next.js Team**: 훌륭한 프레임워크
- **Tailwind CSS**: 아름다운 CSS 프레임워크
- **Web Speech API**: 브라우저 음성 인식 기술

## 📞 지원

- **이슈 리포트**: [GitHub Issues](https://github.com/your-username/colive-talk/issues)
- **문의사항**: [Discussions](https://github.com/your-username/colive-talk/discussions)
- **기능 요청**: [Feature Requests](https://github.com/your-username/colive-talk/discussions/categories/feature-requests)

---

**Colive Talk**로 더 나은 라이브 스트리밍 경험을 만들어보세요! 🎬✨