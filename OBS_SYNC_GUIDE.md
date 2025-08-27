# 🎯 OBS 동기화 완벽 가이드

**OBS Browser Source와 실시간 자막 동기화 해결방법**

## ❌ 문제점 분석

### OBS Browser Source의 제한사항
1. **샌드박스 환경**: OBS Browser Source는 격리된 환경에서 실행
2. **localStorage 제한**: 다른 브라우저 탭과 localStorage 공유 안됨
3. **PostMessage 제한**: window.postMessage가 OBS 환경에서 제한적
4. **Cross-origin 제한**: 일반적인 브라우저 간 통신 방법 불가

### 실패했던 방법들
- ❌ localStorage + storage 이벤트
- ❌ PostMessage 브로드캐스트
- ❌ URL 해시 변경 감지
- ❌ 클라이언트 사이드 폴링

## ✅ 해결 방법: API 기반 동기화

### 핵심 원리
OBS는 샌드박스 환경이지만 **HTTP API 요청은 정상 작동**합니다.
서버를 중간 매개체로 사용하여 데이터를 동기화합니다.

### 구현 아키텍처

```
메인 페이지 (음성 인식)
    ↓ POST /api/subtitle-status
서버 메모리 (실시간 데이터 저장)
    ↑ GET /api/subtitle-status (200ms 폴링)
OBS 오버레이 (자막 표시)
```

## 🔧 구현 세부사항

### 1. API 엔드포인트 구현

**파일**: `src/app/api/subtitle-status/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

// 인메모리 데이터 저장소
let subtitleData = {
  originalText: '',
  translatedText: '',
  isListening: false,
  isTranslating: false,
  timestamp: 0
};

export async function GET() {
  return NextResponse.json({
    success: true,
    data: subtitleData,
    timestamp: Date.now()
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    subtitleData = {
      originalText: body.originalText || '',
      translatedText: body.translatedText || '',
      isListening: body.isListening || false,
      isTranslating: body.isTranslating || false,
      timestamp: Date.now()
    };
    
    return NextResponse.json({
      success: true,
      message: 'Updated',
      data: subtitleData
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to update'
    }, { status: 500 });
  }
}
```

### 2. 메인 페이지에서 API로 데이터 전송

**파일**: `src/app/page.tsx`

```typescript
const updateSubtitles = useCallback(async (originalText: string, translatedText: string, isListening: boolean, isTranslating: boolean) => {
  const updateData = {
    originalText,
    translatedText,
    isListening,
    isTranslating,
    sourceLanguage,
    targetLanguage,
    status: isTranslating ? '번역 중' : '완료'
  };

  // 1. localStorage 동기화 (브라우저용)
  syncService.updateData(updateData);

  // 2. API 전송 (OBS용) ← 핵심!
  try {
    const response = await fetch('/api/subtitle-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    
    if (response.ok) {
      console.log('📡 API 전송 성공');
    }
  } catch (error) {
    console.error('❌ API 전송 오류:', error);
  }

  // 3. PostMessage (브라우저 호환성)
  // ...
}, [sourceLanguage, targetLanguage]);
```

### 3. OBS 오버레이에서 API 폴링

**파일**: `src/app/overlay/page.tsx`

```typescript
const loadData = async () => {
  // API 우선 시도 (OBS용)
  try {
    const response = await fetch('/api/subtitle-status');
    if (response.ok) {
      const result = await response.json();
      const data = result.data;
      
      if (data && (data.originalText || data.translatedText)) {
        setOriginalText(data.originalText || '');
        setTranslatedText(data.translatedText || '');
        setIsListening(data.isListening || false);
        return; // 성공하면 localStorage 확인 안함
      }
    }
  } catch (error) {
    console.log('API 실패, localStorage로 폴백');
  }

  // localStorage 폴백 (브라우저용)
  // ...
};

// 200ms 간격으로 폴링
const interval = setInterval(loadData, 200);
```

## 🎯 핵심 성공 요소

### 1. **우선순위 기반 동기화**
```
1순위: API 폴링 (OBS에서 가장 안정적)
2순위: localStorage (브라우저 환경용)
3순위: PostMessage (브라우저 환경용)
```

### 2. **빠른 폴링 간격**
- **200ms 간격**: 실시간 느낌을 위한 최적 간격
- 너무 빠르면: 서버 부하
- 너무 느리면: 동기화 지연

### 3. **에러 처리**
- API 실패시 localStorage로 자동 폴백
- OBS와 브라우저 모두 지원

### 4. **인메모리 저장소**
- 파일 저장소나 DB 불필요
- 서버 재시작시 초기화 (문제없음)
- 빠른 응답 속도

## 🧪 테스트 방법

### OBS Browser Source 설정
1. **URL**: `http://localhost:3000/overlay?debug=true`
2. **Width**: 1920
3. **Height**: 1080
4. **Custom CSS**: (필요시)

### 디버그 확인
- `debug=true` 파라미터로 실시간 동기화 상태 확인
- 콘솔에서 API 요청/응답 로그 확인
- 200ms마다 폴링 로그 확인

## 📋 체크리스트

실제 구현시 확인사항:

- [ ] API 엔드포인트 정상 작동 확인 (`GET /api/subtitle-status`)
- [ ] 메인 페이지에서 API POST 요청 전송 확인
- [ ] 오버레이에서 API GET 요청 수신 확인
- [ ] 200ms 폴링 간격 설정 확인
- [ ] 에러 처리 및 폴백 로직 구현 확인
- [ ] OBS Browser Source에서 실제 테스트 완료

## 🚨 주의사항

### 개발 환경
- localhost에서만 작동 (개발 서버)
- 프로덕션 배포시 도메인 변경 필요

### 성능 고려사항
- 200ms 폴링이 서버에 무리주지 않음 (가벼운 JSON 응답)
- 동시 사용자가 많을 경우 폴링 간격 조정 고려

### 브라우저 호환성
- 모든 모던 브라우저에서 fetch API 지원
- OBS Browser Source는 Chromium 기반

## 📈 향후 개선 방안

1. **WebSocket**: 실시간 양방향 통신으로 폴링 대체
2. **Server-Sent Events**: 서버에서 클라이언트로 실시간 푸시
3. **Redis**: 다중 서버 환경에서 데이터 공유
4. **캐싱**: 동일 데이터 중복 전송 방지

---

**🎉 이 방법으로 OBS 동기화 문제가 완전히 해결됩니다!**

마지막 업데이트: 2025-08-27
작성자: Claude Code Assistant