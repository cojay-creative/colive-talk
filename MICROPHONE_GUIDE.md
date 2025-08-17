# 🎤 마이크 선택 솔루션 가이드

이 가이드는 실시간 자막 번역 서비스에서 **마이크 입력 장치를 선택할 수 있는 다양한 솔루션**을 설명합니다.

## 📋 현재 구현된 솔루션

### 1. 🔧 **하이브리드 방식** (현재 구현됨)

브라우저 기본 Web Speech API와 고급 커스텀 STT를 선택할 수 있습니다.

#### **기본 모드 (Web Speech API)**
- ✅ **장점**: 완전 무료, 추가 설정 불필요, 빠른 응답속도
- ❌ **단점**: 브라우저 기본 마이크만 사용 가능 (마이크 선택 불가)
- 🔧 **사용법**: 브라우저 설정에서 기본 마이크 변경

#### **고급 모드 (커스텀 STT)**  
- ✅ **장점**: 특정 마이크 선택 가능, 높은 정확도
- ❌ **단점**: API 키 필요, 약간의 지연시간, 비용 발생 가능
- 🔧 **사용법**: API 키 설정 후 마이크 드롭다운에서 선택

---

## 🛠️ 고급 모드 설정 방법

### 1단계: API 키 설정

`.env.local` 파일을 생성하고 API 키를 추가하세요:

```bash
# .env.local
OPENAI_API_KEY=sk-your-openai-api-key-here
GOOGLE_STT_KEY=your-google-stt-api-key-here
```

### 2단계: 서버 재시작

```bash
npm run dev
```

### 3단계: 고급 모드 선택

1. 브라우저에서 앱 접속
2. 🎤 마이크 설정 → 고급 (마이크 선택 가능) 선택
3. 드롭다운에서 원하는 마이크 선택
4. 음성 인식 시작

---

## 🚀 추가 가능한 솔루션들

현재 구현되지 않았지만 향후 추가할 수 있는 솔루션들입니다:

### 2. **WebRTC + 실시간 STT 스트리밍**
```javascript
// 실시간 오디오 스트리밍으로 더 낮은 지연시간
const stream = await navigator.mediaDevices.getUserMedia({
  audio: { deviceId: selectedMicrophone }
});
// WebSocket으로 실시간 STT 서비스에 전송
```

### 3. **브라우저 확장(Extension) 방식**
```javascript
// 시스템 레벨 오디오 접근
chrome.audio.getDevices((devices) => {
  // 더 정밀한 오디오 디바이스 제어
});
```

### 4. **데스크톱 앱 (Electron) 방식**
```javascript
// Native 오디오 API 접근
const audioDevices = require('electron').desktopCapturer;
```

---

## 📊 솔루션 비교표

| 방식 | 마이크 선택 | 비용 | 설정 복잡도 | 정확도 | 지연시간 |
|------|------------|------|------------|--------|----------|
| **Web Speech API** | ❌ | 무료 | 쉬움 | 보통 | 낮음 |
| **커스텀 STT** | ✅ | 유료 | 보통 | 높음 | 보통 |
| **WebRTC 스트리밍** | ✅ | 유료 | 어려움 | 높음 | 낮음 |
| **브라우저 확장** | ✅ | 무료 | 어려움 | 보통 | 낮음 |
| **데스크톱 앱** | ✅ | 무료 | 매우 어려움 | 높음 | 낮음 |

---

## 🎯 권장사항

### **일반 사용자**
- **기본 모드** 사용 → 브라우저 설정에서 마이크 변경

### **전문 사용자/방송인**
- **고급 모드** 사용 → API 키 설정 후 특정 마이크 선택

### **개발자/기업**
- **WebRTC 스트리밍** 구현 → 최고 성능이 필요한 경우

---

## 🔧 문제 해결

### Q: 마이크 드롭다운이 비활성화되어 있어요
A: "고급 (마이크 선택 가능)" 모드를 선택하고 API 키를 설정했는지 확인하세요.

### Q: 고급 모드에서 "STT 서비스 연결 실패" 오류가 나요
A: 
1. `.env.local` 파일의 API 키가 올바른지 확인
2. 서버가 재시작되었는지 확인
3. API 키에 충분한 크레딧이 있는지 확인

### Q: 기본 모드에서 다른 마이크를 사용하고 싶어요
A: 브라우저 설정에서 기본 마이크를 변경하세요:
- **Chrome**: 주소창 🔒 → 마이크 설정
- **Firefox**: 주소창 🔒 → 연결 상태 → 마이크 설정

---

## 📚 기술 참고자료

- [Web Speech API MDN 문서](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [MediaDevices.getUserMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [Google Speech-to-Text](https://cloud.google.com/speech-to-text/docs)

---

**📞 지원이 필요하시면 이슈를 생성해주세요!**