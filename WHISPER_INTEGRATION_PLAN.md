# Whisper 모델 통합 계획

## 1. 클라이언트 사이드 Whisper.js 구현 (권장)

### 설치 및 설정
```bash
npm install @xenova/transformers
```

### 구현 예시
```javascript
// src/lib/whisper-speech.ts
import { pipeline } from '@xenova/transformers';

export class WhisperSpeechService {
  private transcriber: any = null;
  private isInitialized = false;
  
  async initialize() {
    if (!this.isInitialized) {
      console.log('🚀 Whisper 모델 로딩 중...');
      this.transcriber = await pipeline(
        'automatic-speech-recognition',
        'openai/whisper-base',  // 39MB - 실용적 크기
        { 
          device: 'webgpu',  // GPU 가속 (가능한 경우)
          dtype: 'fp16'      // 메모리 최적화
        }
      );
      this.isInitialized = true;
      console.log('✅ Whisper 모델 로딩 완료');
    }
  }
  
  async transcribe(audioBlob: Blob): Promise<string> {
    if (!this.isInitialized) await this.initialize();
    
    const arrayBuffer = await audioBlob.arrayBuffer();
    const result = await this.transcriber(arrayBuffer);
    return result.text;
  }
}
```

### 현재 Web Speech API 대체
```javascript
// src/app/page.tsx 수정
const whisperService = new WhisperSpeechService();

// MediaRecorder로 오디오 캡처
const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  
  mediaRecorder.ondataavailable = async (event) => {
    if (event.data.size > 0) {
      const transcription = await whisperService.transcribe(event.data);
      // 기존 onResult 콜백 호출
      handleTranscription(transcription);
    }
  };
  
  // 실시간 처리를 위해 1초마다 데이터 수집
  mediaRecorder.start(1000);
};
```

## 2. 성능 최적화 방안

### 모델 크기별 선택
- **whisper-tiny**: 39MB, 빠름, 정확도 중간
- **whisper-base**: 74MB, 균형잡힌 성능 (권장)
- **whisper-small**: 244MB, 높은 정확도
- **whisper-medium**: 769MB, 최고 정확도

### Progressive Loading
```javascript
// 사용자 경험 개선
const loadWhisperWithProgress = async () => {
  setStatus('AI 음성인식 모델 다운로드 중... (0%)');
  
  const transcriber = await pipeline(
    'automatic-speech-recognition',
    'openai/whisper-base',
    {
      progress_callback: (progress) => {
        const percent = Math.round(progress.progress * 100);
        setStatus(`AI 음성인식 모델 다운로드 중... (${percent}%)`);
      }
    }
  );
  
  setStatus('AI 음성인식 준비 완료!');
  return transcriber;
};
```

## 3. 하이브리드 접근법

### Web Speech API + Whisper 병행 사용
```javascript
class HybridSpeechService {
  private useWhisper = true;
  
  async startRecognition() {
    if (this.useWhisper && await this.checkWebGPUSupport()) {
      return this.startWhisperRecognition();
    } else {
      // 폴백: 기존 Web Speech API 사용
      return this.startWebSpeechRecognition();
    }
  }
  
  private async checkWebGPUSupport() {
    return 'gpu' in navigator || 'webgpu' in navigator;
  }
}
```

## 4. 서버 사이드 Whisper (고성능 옵션)

### Docker 컨테이너 배포
```dockerfile
FROM python:3.9
RUN pip install openai-whisper flask
COPY whisper_server.py /app/
EXPOSE 8000
CMD ["python", "/app/whisper_server.py"]
```

### Next.js와 통합
```javascript
// src/app/api/whisper-transcribe/route.ts
export async function POST(request: Request) {
  const formData = await request.formData();
  const audioFile = formData.get('audio') as File;
  
  // Python Whisper 서버로 전송
  const response = await fetch('http://whisper-server:8000/transcribe', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  return Response.json(result);
}
```

## 5. 예상 성능 개선

### 정확도 비교
- **현재 Web Speech API**: 85-90% (한국어)
- **Whisper Base**: 95-98% (한국어)
- **다국어 지원**: 99개 언어 → 글로벌 서비스 가능

### 확장성
- **현재**: 브라우저 API 의존 → 제한적
- **Whisper**: 완전 자체 제어 → 무제한 확장 가능

### 비용
- **현재**: 무료 (제한 있음)
- **Whisper**: 완전 무료 + 오픈소스

## 6. 구현 우선순위

1. **Phase 1**: Whisper.js 클라이언트 구현
2. **Phase 2**: 하이브리드 시스템 (성능에 따라 선택)
3. **Phase 3**: 서버 사이드 Whisper (대용량 서비스)

## 7. 주의사항

### 브라우저 호환성
- Chrome 90+ (WebAssembly SIMD)
- Firefox 89+
- Safari 15+
- 모바일: 성능 제한 있을 수 있음

### 메모리 사용량
- Whisper Base: ~200MB RAM 사용
- 저사양 디바이스에서 성능 저하 가능

### 초기 로딩 시간
- 모델 다운로드: 10-30초 (최초 1회)
- 캐싱으로 재방문 시 즉시 사용 가능