// Whisper 기반 고품질 음성인식 서비스 (브라우저 전용)
// 서버 사이드에서는 import하지 않음
let pipeline: any = null;

// 브라우저에서만 동적으로 import (강화된 오류 처리)
const loadTransformers = async () => {
  if (typeof window === 'undefined') {
    throw new Error('서버 환경에서는 Whisper 사용 불가');
  }
  
  if (pipeline) {
    console.log('🔄 기존 Whisper 파이프라인 재사용');
    return pipeline;
  }
  
  try {
    console.log('🚀 Transformers 라이브러리 로딩 시작...');
    console.log('🔍 네트워크 상태:', navigator.onLine ? '온라인' : '오프라인');
    
    // 브라우저 환경 강제 설정
    if (typeof globalThis !== 'undefined') {
      globalThis.XENOVA_TRANSFORMERS_ENV = 'browser';
      console.log('✅ 브라우저 환경 강제 설정 완료');
    }
    
    // 동적 import 시도
    console.log('📦 @xenova/transformers 패키지 임포트 중...');
    const transformers = await import('@xenova/transformers');
    console.log('✅ @xenova/transformers 라이브러리 로드 성공:', typeof transformers);
    
    // WASM 백엔드 최적화 설정
    if (transformers.env && transformers.env.backends) {
      try {
        transformers.env.backends.onnx.wasm.numThreads = 1;
        transformers.env.backends.onnx.wasm.simd = true;
        console.log('✅ WASM 백엔드 최적화 설정 완료');
      } catch (envError) {
        console.warn('⚠️ WASM 설정 실패 (계속 진행):', envError);
      }
    }
    
    pipeline = transformers.pipeline;
    console.log('✅ Whisper 파이프라인 준비 완료');
    return pipeline;
    
  } catch (error) {
    console.error('❌ Transformers 라이브러리 로딩 실패:');
    console.error('   오류 타입:', error.constructor.name);
    console.error('   오류 메시지:', error.message);
    console.error('   전체 스택:', error);
    
    // 구체적인 오류 메시지 제공
    if (error.message && error.message.includes('require')) {
      throw new Error('브라우저 호환성 문제: require() 함수 사용 불가');
    } else if (error.message && error.message.includes('node:')) {
      throw new Error('Node.js 모듈 호환성 문제');
    } else {
      throw new Error(`Whisper 라이브러리 로딩 실패: ${error.message}`);
    }
  }
};

interface WhisperConfig {
  model: 'whisper-tiny' | 'whisper-base' | 'whisper-small';
  language?: string;
  chunkDuration: number; // 실시간 처리 간격 (밀리초)
}

export class WhisperSpeechService {
  private transcriber: any = null;
  private isInitialized = false;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private isListening = false;
  private shouldRestart = true;
  
  // 설정 (더 작은 모델로 시작)
  private config: WhisperConfig = {
    model: 'whisper-tiny',  // 39MB - 빠른 로딩, 기본 품질
    chunkDuration: 2000     // 2초마다 처리
  };
  
  // 콜백 함수들 (기존 Web Speech API와 동일한 인터페이스)
  private onResultCallback: ((text: string) => void) | null = null;
  private onInterimResultCallback: ((text: string) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onStatusCallback: ((status: string) => void) | null = null;
  private onEndCallback: (() => void) | null = null;

  constructor(config?: Partial<WhisperConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    console.log('🎙️ Whisper Speech Service 생성자 호출됨');
    console.log('🎙️ Whisper Speech Service 초기화:', this.config);
    console.log('🔍 브라우저 환경:', typeof window !== 'undefined' ? '브라우저' : '서버');
  }

  // 기존 Web Speech API와 동일한 인터페이스
  onResult(callback: (text: string) => void) {
    this.onResultCallback = callback;
  }

  onInterimResult(callback: (text: string) => void) {
    this.onInterimResultCallback = callback;
  }

  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }

  onStatus(callback: (status: string) => void) {
    this.onStatusCallback = callback;
  }

  onEnd(callback: () => void) {
    this.onEndCallback = callback;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      console.log('🔄 Whisper 이미 초기화됨');
      return true;
    }
    
    if (typeof window === 'undefined') {
      console.warn('⚠️ 서버 환경: Whisper 초기화 건너뜀');
      return false;
    }

    // 브라우저 호환성 확인
    console.log('🔍 브라우저 환경 확인:', {
      userAgent: navigator.userAgent,
      onLine: navigator.onLine,
      webAssembly: typeof WebAssembly !== 'undefined',
      mediaDevices: !!navigator.mediaDevices,
      mediaRecorder: typeof MediaRecorder !== 'undefined'
    });

    try {
      this.updateStatus('🤖 AI 음성인식 모델 준비 중...');
      console.log('🚀 Whisper 모델 로딩 시작:', `openai/${this.config.model}`);

      // Transformers 라이브러리 로드 (타임아웃 적용)
      console.log('⏳ Transformers 라이브러리 로드 중... (최대 30초 대기)');
      const transformersPromise = loadTransformers();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Transformers 라이브러리 로딩 시간 초과 (30초)')), 30000);
      });
      
      const pipelineFunc = await Promise.race([transformersPromise, timeoutPromise]);
      if (!pipelineFunc) {
        throw new Error('Transformers 파이프라인 함수 없음');
      }

      console.log('🎯 AI 모델 다운로드 시작... (whisper-tiny - 39MB)');
      
      // 진행률 표시와 함께 모델 로드
      let lastPercent = 0;
      this.transcriber = await pipelineFunc(
        'automatic-speech-recognition',
        `openai/${this.config.model}`,
        {
          dtype: 'fp32',           // 호환성 최우선
          device: 'wasm',          // WASM으로 안정성 확보 (WebGPU는 불안정할 수 있음)
          progress_callback: (progress: any) => {
            try {
              if (progress && progress.status === 'downloading' && progress.progress) {
                const percent = Math.round(progress.progress * 100);
                if (percent > lastPercent) {
                  lastPercent = percent;
                  this.updateStatus(`🤖 AI 모델 다운로드: ${percent}%`);
                  console.log(`📥 Whisper 모델 다운로드: ${percent}%`);
                }
              } else if (progress && progress.status === 'loading') {
                this.updateStatus('🤖 AI 모델 로딩 중...');
                console.log('🔄 Whisper 모델 메모리 로딩...');
              }
            } catch (progressError) {
              console.warn('⚠️ 진행률 표시 오류 (무시):', progressError);
            }
          }
        }
      );

      this.isInitialized = true;
      this.updateStatus('🤖 AI 음성인식 준비 완료 (99개 언어 지원)');
      console.log('✅ Whisper AI 초기화 완료! 고품질 음성인식 사용 가능');
      return true;

    } catch (error) {
      console.error('❌ Whisper 초기화 실패:');
      console.error('   오류:', error);
      
      this.isInitialized = false;
      this.transcriber = null;
      
      const errorMsg = `AI 모델 로딩 실패: ${error.message || error}`;
      this.handleError(errorMsg);
      console.log('🔄 Web Speech API로 폴백 예정...');
      
      return false;
    }
  }

  async start(language: string = 'ko-KR'): Promise<boolean> {
    try {
      // Whisper 모델 초기화
      if (!this.isInitialized) {
        const success = await this.initialize();
        if (!success) return false;
      }

      this.shouldRestart = true;
      this.updateStatus('마이크 권한 요청 중...');
      console.log('🎤 마이크 권한 요청 시작...');

      // 마이크 권한 요청 및 스트림 생성
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,      // Whisper 최적 샘플레이트
          channelCount: 1,        // 모노 오디오
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      console.log('✅ 마이크 권한 허용됨, MediaRecorder 설정 중...');

      // MediaRecorder 설정
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

      const audioChunks: BlobPart[] = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        if (audioChunks.length > 0 && this.isListening) {
          const audioBlob = new Blob(audioChunks, { type: mimeType });
          await this.processAudioChunk(audioBlob);
          audioChunks.length = 0; // 배열 초기화
        }
      };

      this.mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder 오류:', event.error);
        this.handleError(`녹음 오류: ${event.error}`);
      };

      // 실시간 처리를 위한 주기적 데이터 수집
      console.log(`🎙️ MediaRecorder 시작 (${this.config.chunkDuration}ms 간격)`);
      this.mediaRecorder.start(this.config.chunkDuration);
      this.isListening = true;
      this.updateStatus('🎤 AI 음성인식 활성 (Whisper)');
      
      console.log('✅ Whisper 음성인식 완전 활성화 - 마이크 대기 중');
      return true;

    } catch (error) {
      console.error('❌ 음성인식 시작 실패:', error);
      this.handleError(`음성인식 시작 실패: ${error}`);
      return false;
    }
  }

  stop() {
    try {
      this.shouldRestart = false;
      
      if (this.mediaRecorder && this.isListening) {
        this.mediaRecorder.stop();
        this.isListening = false;
      }

      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }

      this.updateStatus('AI 음성인식 중지됨');
      console.log('🛑 Whisper 음성인식 중지');

      if (this.onEndCallback) {
        this.onEndCallback();
      }

    } catch (error) {
      console.error('❌ 음성인식 중지 중 오류:', error);
      this.handleError(`음성인식 중지 실패: ${error}`);
    }
  }

  private async processAudioChunk(audioBlob: Blob) {
    try {
      if (!this.transcriber || !this.isListening) return;

      console.log('🔄 Whisper 오디오 처리:', audioBlob.size, 'bytes');
      this.updateStatus('🧠 AI 음성 분석 중...');

      // 오디오 데이터를 ArrayBuffer로 변환
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Whisper로 음성 → 텍스트 변환
      const startTime = Date.now();
      const result = await this.transcriber(arrayBuffer, {
        language: 'korean', // 한국어 우선 인식
        task: 'transcribe'
      });
      
      const processingTime = Date.now() - startTime;
      const transcription = result.text?.trim();
      
      if (transcription && transcription.length > 0) {
        console.log(`✅ Whisper 인식 성공 (${processingTime}ms):`, transcription);
        this.updateStatus('🎤 AI 음성인식 활성 (Whisper)');
        
        // 중간 결과와 최종 결과 모두 제공
        if (this.onInterimResultCallback) {
          this.onInterimResultCallback(transcription);
        }
        
        if (this.onResultCallback) {
          this.onResultCallback(transcription);
        }
      } else {
        console.log('🔇 Whisper: 인식된 음성 없음');
      }

      // 계속 녹음 중이면 다음 청크 시작
      if (this.isListening && this.shouldRestart) {
        setTimeout(() => {
          if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
            this.mediaRecorder.start(this.config.chunkDuration);
          }
        }, 100);
      }

    } catch (error) {
      console.error('❌ Whisper 오디오 처리 실패:', error);
      this.handleError(`AI 음성 분석 실패: ${error}`);
      
      // 오류 발생시에도 자동 재시작 시도 (네트워크 독립적)
      if (this.isListening && this.shouldRestart) {
        console.log('🔄 Whisper 자동 재시작 시도...');
        setTimeout(() => {
          if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
            this.mediaRecorder.start(this.config.chunkDuration);
          }
        }, 1000);
      }
    }
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('📱 지원되는 MIME 타입:', type);
        return type;
      }
    }
    
    console.warn('⚠️ 지원되는 MIME 타입을 찾을 수 없음, 기본값 사용');
    return 'audio/webm';
  }

  private updateStatus(status: string) {
    if (this.onStatusCallback) {
      this.onStatusCallback(status);
    }
  }

  private handleError(error: string) {
    console.error('🚨 Whisper 오류:', error);
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }

  // 정리 함수
  destroy() {
    this.stop();
    this.transcriber = null;
    this.isInitialized = false;
    this.onResultCallback = null;
    this.onInterimResultCallback = null;
    this.onErrorCallback = null;
    this.onStatusCallback = null;
    this.onEndCallback = null;
    console.log('🧹 Whisper Speech Service 정리 완료');
  }

  // 설정 변경
  updateConfig(newConfig: Partial<WhisperConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Whisper 설정 업데이트:', this.config);
  }

  // 모델 상태 확인
  isModelReady(): boolean {
    return this.isInitialized && this.transcriber !== null;
  }

  // 현재 설정 반환
  getConfig(): WhisperConfig {
    return { ...this.config };
  }
}

// 전역 인스턴스 생성 (기존 webSpeechService와 동일한 패턴)
console.log('🌍 Whisper 전역 인스턴스 생성 시작');
export const whisperSpeechService = new WhisperSpeechService();
console.log('🌍 Whisper 전역 인스턴스 생성 완료');