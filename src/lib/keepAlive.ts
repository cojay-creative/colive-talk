// 브라우저 탭 비활성화 방지 및 안정성 유지
export class KeepAliveService {
  private wakeLockSentinel: WakeLockSentinel | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private isActive = false;

  // Wake Lock API로 화면 잠금 방지
  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLockSentinel = await navigator.wakeLock.request('screen');
        console.log('Wake lock 활성화됨');
        
        this.wakeLockSentinel.addEventListener('release', () => {
          console.log('Wake lock 해제됨');
        });
        
        return true;
      } catch (err) {
        console.warn('Wake lock 실패:', err);
        return false;
      }
    } else {
      console.warn('Wake Lock API 지원 안됨');
      return false;
    }
  }

  // Wake Lock 해제
  async releaseWakeLock() {
    if (this.wakeLockSentinel) {
      await this.wakeLockSentinel.release();
      this.wakeLockSentinel = null;
      console.log('Wake lock 수동 해제됨');
    }
  }

  // 브라우저 탭 활성 상태 유지 (더미 작업)
  startKeepAlive() {
    if (this.isActive) return;
    
    this.isActive = true;
    
    // 15초마다 더미 작업 수행하여 탭 활성 상태 유지
    this.intervalId = setInterval(() => {
      // 더미 계산 (브라우저가 탭을 비활성화하지 않도록)
      const dummy = Math.random() * Date.now();
      
      // 웹 워커가 있다면 메시지 전송 (선택사항)
      if (typeof Worker !== 'undefined') {
        try {
          const blob = new Blob(['self.postMessage("ping");'], { type: 'application/javascript' });
          const worker = new Worker(URL.createObjectURL(blob));
          worker.postMessage('ping');
          worker.terminate();
        } catch (err) {
          // 무시
        }
      }
      
      console.log('Keep alive ping:', new Date().toISOString());
    }, 15000);
    
    // 페이지 포커스 이벤트 처리
    this.setupFocusHandlers();
  }

  // Keep alive 중지
  stopKeepAlive() {
    this.isActive = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // 포커스 이벤트 핸들러 설정
  private setupFocusHandlers() {
    // 페이지가 포커스를 잃었을 때
    window.addEventListener('blur', () => {
      console.log('페이지 포커스 손실');
    });

    // 페이지가 포커스를 얻었을 때
    window.addEventListener('focus', () => {
      console.log('페이지 포커스 복구');
      
      // Wake lock 재요청 (해제되었을 수 있음)
      if (this.isActive && !this.wakeLockSentinel) {
        this.requestWakeLock();
      }
    });

    // 브라우저 탭 변경 감지
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('탭이 백그라운드로 이동');
      } else {
        console.log('탭이 포그라운드로 복귀');
        
        // Wake lock 재요청
        if (this.isActive && !this.wakeLockSentinel) {
          this.requestWakeLock();
        }
      }
    });
  }

  // 서비스 시작
  async start() {
    console.log('KeepAlive 서비스 시작');
    await this.requestWakeLock();
    this.startKeepAlive();
  }

  // 서비스 중지
  async stop() {
    console.log('KeepAlive 서비스 중지');
    await this.releaseWakeLock();
    this.stopKeepAlive();
  }

  // 현재 상태 확인
  getStatus() {
    return {
      isActive: this.isActive,
      hasWakeLock: !!this.wakeLockSentinel,
      wakeLockSupported: 'wakeLock' in navigator
    };
  }
}

// 전역 인스턴스
export const keepAliveService = new KeepAliveService();