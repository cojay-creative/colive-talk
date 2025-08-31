// 브라우저 탭 간 실시간 동기화 시스템
export interface LayoutSettings {
  position: 'bottom' | 'top' | 'center';
  orientation: 'horizontal' | 'vertical';
  textAlign: 'left' | 'center' | 'right';
  fontSize: number;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  padding: number;
  margin: number;
  opacity: number;
  // 위치 미세조정
  offsetX: number; // 좌우 이동 (-100 ~ 100)
  offsetY: number; // 상하 이동 (-100 ~ 100)
  // 폰트 관련 추가 속성
  fontFamily?: string;
  fontWeight?: string;
  lineHeight?: number;
  letterSpacing?: string;
  textShadow?: string;
  border?: string;
  backgroundImage?: string;
  backdropFilter?: string;
}

export interface SubtitleData {
  originalText: string;
  translatedText: string;
  isTranslating: boolean;
  timestamp: number;
  sourceLanguage: string;
  targetLanguage: string;
  isListening: boolean;
  status: string;
  error?: string;
  layoutSettings?: LayoutSettings;
}

export class SyncService {
  private static instance: SyncService;
  private listeners: Set<(data: SubtitleData) => void> = new Set();
  private readonly STORAGE_KEY = 'subtitle_sync_data';
  private readonly HEARTBEAT_KEY = 'subtitle_heartbeat';
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isController = false;
  
  private constructor() {
    // 서버사이드 렌더링에서는 초기화하지 않음
    if (typeof window !== 'undefined') {
      this.setupStorageListener();
      this.startHeartbeat();
    }
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  // 컨트롤러 모드 설정 (음성 인식을 담당하는 페이지)
  setAsController(isController: boolean) {
    this.isController = isController;
    if (isController) {
      this.updateHeartbeat();
    }
  }

  // 데이터 업데이트 (컨트롤러에서만 호출)
  updateData(data: Partial<SubtitleData>) {
    if (!this.isController) {
      console.warn('동기화 서비스: 컨트롤러가 아닌 페이지에서 데이터 업데이트 시도:', data);
      return;
    }

    const currentData = this.getData();
    const newData: SubtitleData = {
      ...currentData,
      ...data,
      timestamp: Date.now()
    };

    console.log('💾 동기화 서비스 데이터 저장:', {
      originalText: newData.originalText,
      translatedText: newData.translatedText,
      isListening: newData.isListening,
      isTranslating: newData.isTranslating,
      timestamp: newData.timestamp
    });

    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newData));
      console.log('✅ localStorage 저장 성공');
      
      // 같은 페이지 내 리스너들에게도 즉시 알림 (storage 이벤트는 다른 탭에서만 발생하므로)
      this.notifyListeners(newData);
      console.log('📢 리스너들에게 알림 전송');
      
      this.updateHeartbeat();
    } catch (error) {
      console.error('❌ localStorage 저장 실패:', error);
    }
  }

  // 레이아웃 설정만 업데이트
  updateLayoutSettings(layoutSettings: Partial<LayoutSettings>) {
    const currentData = this.getData();
    const updatedLayoutSettings = {
      ...currentData.layoutSettings,
      ...layoutSettings
    };
    
    this.updateData({ layoutSettings: updatedLayoutSettings as LayoutSettings });
  }

  // 현재 데이터 조회
  getData(): SubtitleData {
    const defaultLayoutSettings: LayoutSettings = {
      position: 'bottom',
      orientation: 'horizontal',
      textAlign: 'center',
      fontSize: 24,
      backgroundColor: 'rgba(0,0,0,0.8)',
      textColor: '#ffffff',
      borderRadius: 8,
      padding: 16,
      margin: 32,
      opacity: 1,
      offsetX: 0,
      offsetY: 0
    };

    const defaultData: SubtitleData = {
      originalText: '',
      translatedText: '',
      isTranslating: false,
      timestamp: 0,
      sourceLanguage: 'ko',
      targetLanguage: 'en',
      isListening: false,
      status: '대기 중',
      layoutSettings: defaultLayoutSettings
    };

    try {
      if (typeof window === 'undefined') return defaultData;
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        // 기존 데이터에 새로운 필드가 없을 경우 기본값과 병합
        if (data.layoutSettings) {
          data.layoutSettings = {
            ...defaultLayoutSettings,
            ...data.layoutSettings
          };
        } else {
          data.layoutSettings = defaultLayoutSettings;
        }
        return data;
      }
    } catch (error) {
      console.error('localStorage 읽기 실패:', error);
    }

    return defaultData;
  }

  // 데이터 변경 리스너 등록
  subscribe(callback: (data: SubtitleData) => void) {
    this.listeners.add(callback);
    
    // 즉시 현재 데이터 전달
    const currentData = this.getData();
    callback(currentData);

    return () => {
      this.listeners.delete(callback);
    };
  }

  // 컨트롤러 활성 상태 확인
  isControllerActive(): boolean {
    try {
      if (typeof window === 'undefined') return false;
      const heartbeat = localStorage.getItem(this.HEARTBEAT_KEY);
      if (!heartbeat) return false;
      
      const lastHeartbeat = parseInt(heartbeat);
      const now = Date.now();
      
      // 5초 이내에 하트비트가 있으면 활성 상태로 간주
      return (now - lastHeartbeat) < 5000;
    } catch {
      return false;
    }
  }

  // Storage 이벤트 리스너 설정
  private setupStorageListener() {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('storage', (e) => {
      if (e.key === this.STORAGE_KEY && e.newValue) {
        try {
          const data: SubtitleData = JSON.parse(e.newValue);
          this.notifyListeners(data);
        } catch (error) {
          console.error('Storage 데이터 파싱 실패:', error);
        }
      }
    });
  }

  // 리스너들에게 데이터 변경 알림
  private notifyListeners(data: SubtitleData) {
    this.listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('리스너 콜백 오류:', error);
      }
    });
  }

  // 하트비트 시작
  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.isController) {
        this.updateHeartbeat();
      }
    }, 2000); // 2초마다 하트비트
  }

  // 하트비트 업데이트
  private updateHeartbeat() {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(this.HEARTBEAT_KEY, Date.now().toString());
    } catch (error) {
      console.error('하트비트 업데이트 실패:', error);
    }
  }

  // 정리
  destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    this.listeners.clear();
    
    if (this.isController) {
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(this.HEARTBEAT_KEY);
        }
      } catch (error) {
        console.error('하트비트 정리 실패:', error);
      }
    }
  }
}

// 전역 인스턴스
export const syncService = SyncService.getInstance();