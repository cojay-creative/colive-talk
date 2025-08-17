// Web Speech API를 사용한 무료 음성 인식 서비스 (개선된 안정성)
export class WebSpeechService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private shouldRestart = false;
  private currentLanguage = 'ko-KR';
  private onResultCallback: ((text: string) => void) | null = null;
  private onInterimResultCallback: ((text: string) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onStatusCallback: ((status: string) => void) | null = null;
  private restartTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastActivity = Date.now();
  private restartAttempts = 0;
  private maxRestartAttempts = 5;
  // MVP: 마이크 관련 복잡한 기능 제거

  constructor() {
    this.initializeSpeechRecognition();
    this.setupPageVisibilityHandler();
    this.startHeartbeat();
    // MVP: 마이크 로드 기능 제거
  }

  // Speech Recognition 초기화
  private initializeSpeechRecognition() {
    // 서버사이드 렌더링에서는 초기화하지 않음
    if (typeof window === 'undefined') {
      console.log('🎤 서버 환경에서는 Speech Recognition 초기화 건너뜀');
      return;
    }

    console.log('🎤 Speech Recognition 초기화 시작');
    
    // 브라우저 호환성 확인
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('🚨 Speech recognition not supported in this browser');
      return;
    }

    // Speech Recognition 객체 생성
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    console.log('✅ SpeechRecognition 클래스 확인 완료');
    
    this.recognition = new SpeechRecognition();
    console.log('✅ SpeechRecognition 객체 생성 완료');

    // 설정
    this.recognition.continuous = true;        // 연속 인식
    this.recognition.interimResults = true;   // 중간 결과 표시
    this.recognition.lang = 'ko-KR';          // 기본 언어: 한국어
    
    // 추가 설정으로 품질 향상
    this.recognition.maxAlternatives = 1;     // 최대 대안 수 제한

    // 이벤트 핸들러 설정
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // 최종 결과가 있으면 콜백 호출
      if (finalTranscript && this.onResultCallback) {
        this.onResultCallback(finalTranscript);
      }

      // 중간 결과가 있고 충분히 길면 중간 콜백 호출 (실시간 번역용)
      if (interimTranscript && interimTranscript.trim().length > 8 && this.onInterimResultCallback) {
        // 노이즈 필터링: 특수 기호나 반복 단어 제거
        const filteredTranscript = this.filterNoise(interimTranscript.trim());
        if (filteredTranscript) {
          this.onInterimResultCallback(filteredTranscript);
        }
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (this.onErrorCallback) {
        this.onErrorCallback(event.error);
      }
    };

    this.recognition.onend = () => {
      console.log('음성 인식 종료됨');
      this.isListening = false;
      
      // 자동 재시작이 필요한 경우
      if (this.shouldRestart) {
        this.notifyStatus('재연결 중...');
        this.scheduleRestart();
      } else {
        this.notifyStatus('음성 인식 중지됨');
      }
    };

    this.recognition.onstart = () => {
      console.log('✅ 음성 인식 시작됨 (onstart 이벤트)');
      this.isListening = true;
      this.restartAttempts = 0;
      this.lastActivity = Date.now();
      this.notifyStatus('음성 인식 활성');
    };

    this.recognition.onaudiostart = () => {
      console.log('오디오 캡처 시작');
      this.lastActivity = Date.now();
    };

    this.recognition.onspeechstart = () => {
      console.log('음성 감지됨');
      this.lastActivity = Date.now();
    };
  }

  // 자동 재시작 스케줄링
  private scheduleRestart() {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
    }

    const delay = Math.min(1000 * Math.pow(2, this.restartAttempts), 10000); // 지수 백오프, 최대 10초
    console.log(`${delay}ms 후 재시작 시도 (${this.restartAttempts + 1}/${this.maxRestartAttempts})`);

    this.restartTimeout = setTimeout(() => {
      if (this.shouldRestart && this.restartAttempts < this.maxRestartAttempts) {
        this.restartAttempts++;
        this.forceStart();
      } else if (this.restartAttempts >= this.maxRestartAttempts) {
        this.notifyStatus('재연결 실패 - 수동으로 다시 시작해주세요');
        this.notifyError('최대 재시도 횟수 초과');
      }
    }, delay);
  }

  // 강제 시작 (내부용)
  private forceStart() {
    if (!this.recognition || !this.shouldRestart) return;

    try {
      this.recognition.lang = this.currentLanguage;
      this.recognition.start();
    } catch (error) {
      console.warn('재시작 실패:', error);
      if (this.shouldRestart) {
        this.scheduleRestart();
      }
    }
  }

  // 페이지 가시성 변경 처리
  private setupPageVisibilityHandler() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('페이지가 백그라운드로 이동');
      } else {
        console.log('페이지가 포그라운드로 복귀');
        this.lastActivity = Date.now();
        
        // 페이지 복귀 시 음성 인식이 중단된 경우 재시작
        if (this.shouldRestart && !this.isListening) {
          console.log('페이지 복귀 시 음성 인식 재시작');
          this.scheduleRestart();
        }
      }
    });
  }

  // 하트비트 시작 (무활동 감지)
  private startHeartbeat() {
    if (typeof window === 'undefined') {
      return;
    }
    
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - this.lastActivity;
      
      // 60초 이상 무활동 시 재시작 (브라우저가 음성 인식을 자동 중단했을 가능성)
      if (this.shouldRestart && this.isListening && timeSinceActivity > 60000) {
        console.log('무활동 감지, 음성 인식 재시작');
        this.restart();
      }
    }, 30000); // 30초마다 체크
  }

  // 재시작
  private restart() {
    if (this.recognition && this.isListening) {
      this.recognition.stop(); // onend에서 자동 재시작됨
    }
  }

  // 상태 알림
  private notifyStatus(status: string) {
    if (this.onStatusCallback) {
      this.onStatusCallback(status);
    }
  }

  // 에러 알림
  private notifyError(error: string) {
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }

  // 음성 인식 시작
  start(lang: string = 'ko-KR') {
    console.log(`🎤 음성 인식 시작 요청 - 언어: ${lang}`);
    
    if (!this.recognition) {
      console.error('🚨 Speech recognition not initialized');
      this.notifyError('음성 인식이 초기화되지 않았습니다');
      return false;
    }

    try {
      this.currentLanguage = lang;
      this.shouldRestart = true;
      this.restartAttempts = 0;
      this.lastActivity = Date.now();
      
      if (this.restartTimeout) {
        clearTimeout(this.restartTimeout);
        this.restartTimeout = null;
      }

      this.recognition.lang = lang;
      console.log('✅ 음성 인식 설정 완료, 시작 중...');
      this.recognition.start();
      console.log('✅ 음성 인식 start() 호출 완료');
      return true;
    } catch (error) {
      console.error('🚨 Failed to start speech recognition:', error);
      this.notifyError(`음성 인식 시작 실패: ${error}`);
      
      // 시작 실패 시 재시도
      if (this.shouldRestart) {
        this.scheduleRestart();
      }
      return false;
    }
  }

  // 음성 인식 중지
  stop() {
    console.log('음성 인식 중지 요청');
    this.shouldRestart = false;
    
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    
    this.isListening = false;
    this.notifyStatus('음성 인식 중지됨');
  }

  // 언어 설정
  setLanguage(lang: string) {
    this.currentLanguage = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
      console.log(`🎯 언어 설정 변경: ${lang}`);
      
      // 언어별 추가 설정
      if (lang.startsWith('ko')) {
        // 한국어: 더 정확한 인식을 위한 설정
        this.recognition.maxAlternatives = 1;
      } else if (lang.startsWith('en')) {
        // 영어: 영어 인식 최적화
        this.recognition.maxAlternatives = 1;
      }
    }
  }

  // 결과 콜백 설정
  onResult(callback: (text: string) => void) {
    this.onResultCallback = callback;
  }

  // 중간 결과 콜백 설정 (실시간 번역용)
  onInterimResult(callback: (text: string) => void) {
    this.onInterimResultCallback = callback;
  }

  // 에러 콜백 설정
  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }

  // 상태 콜백 설정
  onStatus(callback: (status: string) => void) {
    this.onStatusCallback = callback;
  }

  // 노이즈 필터링 함수
  private filterNoise(text: string): string | null {
    // 특수 기호 제거
    let filtered = text.replace(/[={\[\](){}]/g, '');
    
    // 반복 단어 패턴 제거 (예: "about us" 반복)
    filtered = filtered.replace(/(\b\w+\b)(?:\s+\1)+/g, '$1');
    
    // 너무 짧거나 의미없는 텍스트 제거
    if (filtered.trim().length < 3) {
      return null;
    }
    
    // 숫자나 기호만 있는 경우 제거
    if (/^[\d\s\W]+$/.test(filtered)) {
      return null;
    }
    
    return filtered.trim();
  }

  // 현재 상태 확인
  getStatus() {
    return {
      isListening: this.isListening,
      isSupported: !!this.recognition,
      shouldRestart: this.shouldRestart,
      restartAttempts: this.restartAttempts,
      lastActivity: this.lastActivity
    };
  }

  // 리소스 정리
  destroy() {
    console.log('WebSpeechService 정리 중...');
    this.shouldRestart = false;
    
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    
    this.isListening = false;
  }

  // 지원하는 언어 목록
  getSupportedLanguages() {
    return {
      'ko-KR': '한국어',
      'en-US': 'English (US)',
      'en-GB': 'English (UK)',
      'ja-JP': '日本語',
      'zh-CN': '中文 (简体)',
      'zh-TW': '中文 (繁體)',
      'es-ES': 'Español',
      'fr-FR': 'Français',
      'de-DE': 'Deutsch',
      'ru-RU': 'Русский'
    };
  }

  // MVP: 마이크 관련 복잡한 함수들 제거
}

// 싱글톤 인스턴스
export const webSpeechService = new WebSpeechService();
