// 하이브리드 음성인식 서비스 (Whisper + Web Speech API 폴백)
import { webSpeechService } from './speech';

export class HybridSpeechService {
  private useWhisper = false;
  private whisperService: any = null;
  private currentService: any = null;
  
  // 콜백 함수들
  private onResultCallback: ((text: string) => void) | null = null;
  private onInterimResultCallback: ((text: string) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onStatusCallback: ((status: string) => void) | null = null;
  private onEndCallback: (() => void) | null = null;

  constructor() {
    console.log('🔄 하이브리드 음성인식 서비스 초기화');
    this.detectCapabilities();
  }

  // 브라우저 능력 감지
  private async detectCapabilities() {
    try {
      // Whisper 사용 가능성 확인
      if (typeof window !== 'undefined' && 'MediaRecorder' in window) {
        console.log('🤖 Whisper 지원 감지 시도 중...');
        
        // 동적으로 Whisper 서비스 로드 시도
        const { WhisperSpeechService } = await import('./whisper-speech');
        this.whisperService = new WhisperSpeechService();
        this.useWhisper = true;
        
        console.log('✅ Whisper 모드 활성화');
        this.updateStatus('🤖 AI 음성인식 사용 가능');
      } else {
        throw new Error('Whisper 요구사항 미충족');
      }
    } catch (error) {
      console.warn('⚠️ Whisper 로딩 실패, Web Speech API로 폴백:', error);
      this.useWhisper = false;
      this.updateStatus('🎤 기본 음성인식 사용');
    }
  }

  // 기존 API와 동일한 인터페이스
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

  async start(language: string = 'ko-KR'): Promise<boolean> {
    try {
      if (this.useWhisper && this.whisperService) {
        console.log('🤖 Whisper AI 음성인식 시작');
        this.currentService = this.whisperService;
        
        // Whisper 콜백 설정
        this.whisperService.onResult((text: string) => {
          if (this.onResultCallback) this.onResultCallback(text);
        });
        
        this.whisperService.onInterimResult((text: string) => {
          if (this.onInterimResultCallback) this.onInterimResultCallback(text);
        });
        
        this.whisperService.onError((error: string) => {
          console.warn('🤖 Whisper 오류, Web Speech API로 폴백:', error);
          // Whisper 실패 시 Web Speech API로 자동 전환
          this.fallbackToWebSpeech(language);
        });
        
        this.whisperService.onStatus((status: string) => {
          if (this.onStatusCallback) this.onStatusCallback(status);
        });
        
        this.whisperService.onEnd(() => {
          if (this.onEndCallback) this.onEndCallback();
        });
        
        return await this.whisperService.start(language);
        
      } else {
        return this.startWebSpeech(language);
      }
    } catch (error) {
      console.error('❌ 하이브리드 음성인식 시작 실패:', error);
      return this.fallbackToWebSpeech(language);
    }
  }

  private async fallbackToWebSpeech(language: string): Promise<boolean> {
    console.log('🔄 Web Speech API로 폴백 중...');
    this.useWhisper = false;
    this.currentService = webSpeechService;
    return this.startWebSpeech(language);
  }

  private startWebSpeech(language: string): boolean {
    console.log('🎤 Web Speech API 사용');
    this.currentService = webSpeechService;
    
    // Web Speech API 콜백 설정
    webSpeechService.onResult((text: string) => {
      if (this.onResultCallback) this.onResultCallback(text);
    });
    
    webSpeechService.onInterimResult((text: string) => {
      if (this.onInterimResultCallback) this.onInterimResultCallback(text);
    });
    
    webSpeechService.onError((error: string) => {
      if (this.onErrorCallback) this.onErrorCallback(error);
    });
    
    webSpeechService.onStatus((status: string) => {
      if (this.onStatusCallback) this.onStatusCallback(status);
    });
    
    webSpeechService.onEnd(() => {
      if (this.onEndCallback) this.onEndCallback();
    });
    
    return webSpeechService.start(language);
  }

  stop() {
    try {
      if (this.currentService) {
        this.currentService.stop();
      }
      this.currentService = null;
      console.log('🛑 하이브리드 음성인식 중지');
    } catch (error) {
      console.error('❌ 음성인식 중지 중 오류:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(`음성인식 중지 실패: ${error}`);
      }
    }
  }

  private updateStatus(status: string) {
    if (this.onStatusCallback) {
      this.onStatusCallback(status);
    }
  }

  // 정리 함수
  destroy() {
    this.stop();
    
    if (this.whisperService && this.whisperService.destroy) {
      this.whisperService.destroy();
    }
    
    this.whisperService = null;
    this.currentService = null;
    this.onResultCallback = null;
    this.onInterimResultCallback = null;
    this.onErrorCallback = null;
    this.onStatusCallback = null;
    this.onEndCallback = null;
    
    console.log('🧹 하이브리드 음성인식 서비스 정리 완료');
  }

  // 현재 사용 중인 서비스 확인
  getCurrentService(): 'whisper' | 'webspeech' | 'none' {
    if (this.useWhisper && this.currentService === this.whisperService) {
      return 'whisper';
    } else if (this.currentService === webSpeechService) {
      return 'webspeech';
    } else {
      return 'none';
    }
  }
}

// 전역 인스턴스 생성
export const hybridSpeechService = new HybridSpeechService();