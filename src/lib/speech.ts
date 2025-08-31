// Web Speech API를 사용한 무료 음성 인식 서비스 (개선된 안정성)
export class WebSpeechService {
  private recognition: any | null = null;
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
  private maxRestartAttempts = 10; // 재시도 횟수 증가 (5 → 10)
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
    this.recognition.onresult = (event: any) => {
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

      // 중간 결과를 더 적극적으로 처리 (3글자부터 즉시 번역)
      if (interimTranscript && interimTranscript.trim().length > 2 && this.onInterimResultCallback) {
        // 노이즈 필터링: 특수 기호나 반복 단어 제거
        const filteredTranscript = this.filterNoise(interimTranscript.trim());
        if (filteredTranscript) {
          // 활동 시간 업데이트 (더 자주)
          this.lastActivity = Date.now();
          this.onInterimResultCallback(filteredTranscript);
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('🚨 Speech recognition error:', event.error, 'Type:', event.type);
      
      // 네트워크 오류 및 복구 가능한 오류들에 대한 특별 처리
      const recoverableErrors = ['network', 'audio-capture', 'aborted', 'no-speech', 'service-not-allowed'];
      const isRecoverableError = recoverableErrors.includes(event.error);
      
      if (isRecoverableError && this.shouldRestart) {
        console.log(`🔄 복구 가능한 오류 감지: ${event.error} - 자동 재시작 시도`);
        
        // 상태를 listening으로 유지 (UI에서 중단된 것처럼 보이지 않게)
        this.isListening = true;
        
        // 상태 알림
        this.notifyStatus(`네트워크 오류 - 재연결 중... (${event.error})`);
        
        // 즉시 재시작 시도
        setTimeout(() => {
          if (this.shouldRestart) {
            console.log('🔄 오류 후 즉시 재시작 시도');
            this.forceStart();
          }
        }, 1000); // 1초 후 재시작
        
      } else {
        // 복구 불가능한 오류는 사용자에게 알림
        console.error('❌ 복구 불가능한 오류:', event.error);
        if (this.onErrorCallback) {
          this.onErrorCallback(`음성 인식 오류: ${event.error}`);
        }
      }
    };

    this.recognition.onend = () => {
      console.log('🔚 음성 인식 종료됨');
      
      // 자동 재시작이 필요한 경우 (사용자가 중지하지 않았다면)
      if (this.shouldRestart) {
        console.log('🔄 예상치 못한 종료 - 자동 재시작 예약');
        
        // isListening을 false로 설정하지 않음 (UI 상태 유지)
        this.notifyStatus('연결 끊김 - 재연결 중...');
        
        // 더 빠른 재시작
        setTimeout(() => {
          if (this.shouldRestart) {
            console.log('🔄 종료 후 자동 재시작');
            this.forceStart();
          }
        }, 500); // 0.5초 후 재시작
        
      } else {
        // 사용자가 의도적으로 중지한 경우만 isListening을 false로 설정
        this.isListening = false;
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

  // 자동 재시작 스케줄링 (강화된 복구 로직)
  private scheduleRestart() {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
    }

    // 더 적극적인 재시도 (더 짧은 지연, 더 많은 시도)
    const delay = Math.min(500 * Math.pow(1.5, this.restartAttempts), 5000); // 0.5초부터 최대 5초
    console.log(`⏱️ ${delay}ms 후 재시작 시도 (${this.restartAttempts + 1}/${this.maxRestartAttempts})`);

    this.restartTimeout = setTimeout(() => {
      if (this.shouldRestart && this.restartAttempts < this.maxRestartAttempts) {
        this.restartAttempts++;
        
        // 네트워크 상태 확인 후 재시작
        if (navigator.onLine) {
          console.log('🌐 네트워크 연결 확인됨 - 재시작 시도');
          this.forceStart();
        } else {
          console.log('🚫 네트워크 연결 없음 - 연결 대기 중');
          this.notifyStatus('네트워크 연결 대기 중...');
          this.scheduleRestart(); // 다시 스케줄링
        }
      } else if (this.restartAttempts >= this.maxRestartAttempts) {
        console.log('❌ 최대 재시도 횟수 초과');
        this.isListening = false; // 최종 실패시에만 false로 설정
        this.notifyStatus('연결 실패 - 음성 인식을 다시 시작해주세요');
        this.notifyError('네트워크 문제로 음성 인식을 계속할 수 없습니다. 다시 시작해주세요.');
      }
    }, delay);
  }

  // 강제 시작 (내부용) - 개선된 오류 처리
  private forceStart() {
    if (!this.recognition || !this.shouldRestart) {
      console.log('🚫 강제 시작 조건 불만족');
      return;
    }

    try {
      console.log('🔄 음성 인식 강제 시작 시도...');
      
      // 기존 인식이 활성화되어 있다면 중지
      if (this.isListening) {
        try {
          this.recognition.stop();
        } catch (e) {
          console.log('기존 인식 중지 중 오류 (무시):', e);
        }
        // 잠시 대기 후 시작
        setTimeout(() => {
          if (this.shouldRestart) {
            this.startRecognition();
          }
        }, 100);
      } else {
        this.startRecognition();
      }
      
    } catch (error) {
      console.warn('❌ 강제 재시작 실패:', error);
      if (this.shouldRestart) {
        console.log('🔄 재시작 실패로 인한 스케줄링');
        this.scheduleRestart();
      }
    }
  }
  
  // 실제 인식 시작 로직 분리
  private startRecognition() {
    try {
      this.recognition.lang = this.currentLanguage;
      this.recognition.start();
      console.log('✅ 음성 인식 시작 명령 전송');
    } catch (error) {
      console.error('❌ 음성 인식 시작 실패:', error);
      throw error;
    }
  }

  // 페이지 가시성 변경 처리 (백그라운드 지속 동작 강화)
  private setupPageVisibilityHandler() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    
    // 페이지 가시성 변화 감지
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('🔄 페이지가 백그라운드로 이동 - 음성인식 강제 유지');
        this.lastActivity = Date.now();
        
        // 백그라운드 진입 시 즉시 재시작 시도 (브라우저가 멈추기 전에)
        if (this.shouldRestart && this.isListening) {
          console.log('🔄 백그라운드 진입 - 예방적 재시작');
          setTimeout(() => {
            if (document.hidden && this.shouldRestart && !this.isListening) {
              console.log('🔄 백그라운드에서 음성인식 중단됨 - 재시작 시도');
              this.forceStart();
            }
          }, 1000); // 1초 후 상태 체크 및 재시작
        }
      } else {
        console.log('🔄 페이지가 포그라운드로 복귀');
        this.lastActivity = Date.now();
        
        // 페이지 복귀 시 음성 인식 상태 확인 및 즉시 재시작
        setTimeout(() => {
          if (this.shouldRestart && !this.isListening) {
            console.log('🔄 페이지 복귀 후 즉시 음성 인식 재시작');
            this.restartAttempts = 0;
            this.forceStart();
          }
        }, 100); // 100ms 후 재시작 (페이지 안정화 대기)
      }
    });
  }
  
  // 네트워크 연결 모니터링 추가
  private setupNetworkMonitoring() {
    if (typeof window === 'undefined') {
      return;
    }
    
    // 네트워크 연결 복구 시 자동 재시작
    window.addEventListener('online', () => {
      console.log('🌐 네트워크 연결 복구됨');
      
      if (this.shouldRestart && !this.isListening) {
        console.log('🔄 네트워크 복구 후 음성 인식 재시작');
        this.restartAttempts = 0; // 시도 횟수 초기화
        
        setTimeout(() => {
          if (this.shouldRestart && !this.isListening) {
            this.forceStart();
          }
        }, 1000); // 1초 대기 후 재시작
      }
    });
    
    // 네트워크 연결 끊김 감지
    window.addEventListener('offline', () => {
      console.log('🚫 네트워크 연결 끊김');
      
      if (this.shouldRestart && this.isListening) {
        this.notifyStatus('네트워크 연결 끊김 - 연결 대기 중...');
      }
    });

    // 포커스 이벤트도 감지
    window.addEventListener('focus', () => {
      console.log('🔄 윈도우 포커스 복귀');
      this.lastActivity = Date.now();
      if (this.shouldRestart && !this.isListening) {
        console.log('🔄 윈도우 포커스 복귀 후 음성 인식 재시작');
        this.restartAttempts = 0;
        this.scheduleRestart();
      }
    });

    window.addEventListener('blur', () => {
      console.log('🔄 윈도우 포커스 상실');
      this.lastActivity = Date.now(); // 포커스 상실시에도 활동으로 간주
    });
  }

  // 하트비트 시작 (백그라운드 지속 동작 강화)
  private startHeartbeat() {
    if (typeof window === 'undefined') {
      return;
    }
    
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - this.lastActivity;
      
      // 음성인식이 켜져있어야 하는데 실제로는 꺼져있는 경우 즉시 재시작
      if (this.shouldRestart && !this.isListening) {
        console.log('🔄 하트비트: 음성인식 비활성 상태 감지 - 즉시 재시작');
        this.restartAttempts = 0; // 시도 횟수 초기화
        this.forceStart(); // 즉시 재시작 (스케줄링 없이)
      }
      // 더 짧은 무활동 시간으로 변경 (10초)
      else if (this.shouldRestart && this.isListening && timeSinceActivity > 10000) {
        console.log('🔄 하트비트: 10초 무활동 감지 - 음성 인식 재시작');
        this.restart();
      }
      
      // 백그라운드에서 더 적극적으로 활동 시뮬레이션
      if (typeof document !== 'undefined' && document.hidden && this.shouldRestart) {
        this.lastActivity = Date.now();
        // 백그라운드에서 음성인식 상태 강제 체크 및 재시작
        if (!this.isListening && this.shouldRestart) {
          console.log('🔄 백그라운드에서 음성인식 중단 감지 - 강제 재시작');
          this.forceStart();
        }
      }
    }, 2000); // 2초마다 체크 (더 자주 확인)
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
