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
    // 즉시 실행하되 에러 처리 추가
    this.detectCapabilities().catch(error => {
      console.error('❌ 초기화 중 오류:', error);
      this.updateStatus('❌ 초기화 실패 - Web Speech API 사용');
    });
  }

  // 브라우저 능력 감지 (Whisper AI 우선, 안전한 폴백)
  private async detectCapabilities() {
    console.log('🎯 Whisper AI 음성인식 초기화 시작...');
    
    // 기본 Web Speech API 지원 확인 (필수 폴백)
    const hasWebSpeech = typeof window !== 'undefined' && 
      (('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window));
    
    if (!hasWebSpeech) {
      console.error('❌ 브라우저가 음성인식을 지원하지 않습니다');
      this.useWhisper = false;
      this.updateStatus('❌ 음성인식 미지원 브라우저');
      return;
    }
    
    try {
      // Whisper AI 로딩 시도 (주요 기능)
      if (typeof window !== 'undefined' && 'MediaRecorder' in window) {
        console.log('🚀 Whisper AI 모델 로딩 중...');
        this.updateStatus('🤖 AI 모델 준비 중...');
        
        // 시간 제한으로 무한 대기 방지
        const whisperPromise = import('./whisper-speech').then(async (module) => {
          const whisperService = new module.WhisperSpeechService();
          
          // Whisper 초기화 테스트
          const initSuccess = await whisperService.initialize();
          if (!initSuccess) {
            throw new Error('Whisper 초기화 실패');
          }
          
          return whisperService;
        });
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Whisper 로딩 시간 초과 (10초)')), 10000);
        });
        
        this.whisperService = await Promise.race([whisperPromise, timeoutPromise]);
        this.useWhisper = true;
        
        console.log('✅ Whisper AI 활성화 성공! (99개 언어 지원)');
        this.updateStatus('🤖 AI 음성인식 준비 완료');
        
      } else {
        throw new Error('MediaRecorder API 미지원');
      }
    } catch (error) {
      console.warn('⚠️ Whisper AI 초기화 실패, Web Speech API로 안전하게 폴백:', error);
      console.warn('   에러 상세:', error);
      
      this.useWhisper = false;
      this.whisperService = null;
      this.updateStatus('🎤 기본 음성인식 사용 (안정 모드)');
    }
    
    console.log(`🎯 최종 음성인식: ${this.useWhisper ? '🤖 Whisper AI (고품질)' : '🎤 Web Speech API (호환성)'}`);
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
      console.log('🎯 하이브리드 음성인식 시작 요청');
      
      // Whisper 초기화가 아직 진행 중일 수 있으므로 잠시 대기
      if (!this.useWhisper && !this.whisperService) {
        console.log('⏳ Whisper 초기화 대기 중...');
        this.updateStatus('🤖 AI 모델 초기화 대기 중...');
        
        // 최대 15초간 초기화 완료 대기 (모델 다운로드 시간 고려)
        for (let i = 0; i < 150; i++) {
          await new Promise(resolve => setTimeout(resolve, 100));
          if (this.useWhisper || this.whisperService !== null) break;
        }
        
        console.log(`🔍 대기 완료: useWhisper=${this.useWhisper}, hasWhisperService=${!!this.whisperService}`);
      }
      
      if (this.useWhisper && this.whisperService) {
        console.log('🤖 Whisper AI 음성인식 시작 - 마이크 권한 요청 예정');
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
        
        console.log('📞 Whisper 서비스 start() 함수 호출 중...');
        const whisperResult = await this.whisperService.start(language);
        if (whisperResult) {
          console.log('✅ Whisper AI 음성인식 시작 성공 - 마이크 활성화됨');
          return true;
        } else {
          console.warn('⚠️ Whisper 시작 실패, Web Speech로 폴백');
          return this.fallbackToWebSpeech(language);
        }
        
      } else {
        console.log('🎤 Web Speech API로 직접 시작');
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