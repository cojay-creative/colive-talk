'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface SubtitleData {
  originalText: string;
  translatedText: string;
  isTranslating: boolean;
  isListening: boolean;
  timestamp: number;
  sourceLanguage: string;
  targetLanguage: string;
  status: string;
  error?: string;
  layoutSettings?: any;
}

export default function OverlayPage() {
  const [originalText, setOriginalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [fontSize, setFontSize] = useState(24);
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [textColor, setTextColor] = useState('#ffffff');
  const [opacity, setOpacity] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  
  // 자동 디졸브 관련 상태
  const [shouldShow, setShouldShow] = useState(true);
  const [dissolveTimer, setDissolveTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastTextUpdate, setLastTextUpdate] = useState(0);
  const [autoDissolveTime, setAutoDissolveTime] = useState(5); // 기본 5초
  const [enableAutoDissolve, setEnableAutoDissolve] = useState(true);

  console.log('🎬 오버레이 렌더링:', { translatedText, originalText, isListening });
  
  // OBS 환경 감지
  const [isOBS, setIsOBS] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  
  // 관리자 설정 상태
  const [adminSettings, setAdminSettings] = useState({
    inactiveMessage: '안녕하세요! 음성인식을 시작해주세요 🎤',
    listeningMessage: '음성을 듣고 있습니다...',
    translatingMessage: '번역 중...'
  });
  
  // Hydration 문제 해결을 위한 마운트 확인
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // 관리자 설정 로드
  useEffect(() => {
    const loadAdminSettings = async () => {
      try {
        const response = await fetch('/api/admin-settings');
        if (response.ok) {
          const result = await response.json();
          setAdminSettings(result.settings);
          addDebugInfo(`관리자 설정 로드 완료`);
        }
      } catch (error) {
        console.log('관리자 설정 로드 실패, 기본값 사용:', error);
      }
    };
    
    if (isMounted) {
      loadAdminSettings();
    }
  }, [isMounted]);
  
  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
    console.log('🔍 DEBUG:', message);
  };

  // OBS 환경 감지 및 초기화
  useEffect(() => {
    if (!isMounted) return;
    
    if (typeof window !== 'undefined') {
      // OBS 환경 감지
      const userAgent = window.navigator.userAgent;
      const isObsEnvironment = userAgent.includes('CEF') || 
                              userAgent.includes('obs-browser') ||
                              window.location.href.includes('obs') ||
                              !window.opener;
      
      setIsOBS(isObsEnvironment);
      addDebugInfo(`환경 감지: ${isObsEnvironment ? 'OBS' : '일반 브라우저'}`);
      addDebugInfo(`UserAgent: ${userAgent.substring(0, 50)}...`);
      
      const params = new URLSearchParams(window.location.search);
      
      // URL 파라미터 처리
      const showOriginalParam = params.get('showOriginal');
      const sourceParam = params.get('source');
      const targetParam = params.get('target');
      const controlsParam = params.get('controls');
      
      // URL 파라미터에서 직접 텍스트 받기 (테스트용)
      const testOriginalParam = params.get('testOriginal');
      const testTranslatedParam = params.get('testTranslated');
      const testListeningParam = params.get('testListening');
      
      setShowOriginal(showOriginalParam === 'true');
      
      // 테스트 파라미터가 있으면 직접 설정
      if (testOriginalParam || testTranslatedParam) {
        addDebugInfo(`테스트 파라미터 감지: 원본="${testOriginalParam}" 번역="${testTranslatedParam}"`);
        setOriginalText(testOriginalParam || '');
        setTranslatedText(testTranslatedParam || '');
        setIsListening(testListeningParam === 'true');
      }
      
      // 파라미터 로깅
      addDebugInfo(`URL 파라미터: source=${sourceParam}, target=${targetParam}, controls=${controlsParam}, showOriginal=${showOriginalParam}`);
      if (testOriginalParam || testTranslatedParam) {
        addDebugInfo(`테스트 파라미터: testOriginal=${testOriginalParam}, testTranslated=${testTranslatedParam}, testListening=${testListeningParam}`);
      }

      // URL 해시 변경 감지 (추가 동기화 방법)
      const handleHashChange = () => {
        try {
          const hash = window.location.hash.substring(1);
          if (hash) {
            const data = JSON.parse(decodeURIComponent(hash));
            console.log('🔗 URL 해시 데이터 수신:', data);
            if (data.type === 'SUBTITLE_UPDATE') {
              setOriginalText(data.originalText || '');
              setTranslatedText(data.translatedText || '');
              setIsListening(data.isListening || false);
            }
          }
        } catch (error) {
          // 해시가 JSON이 아닌 경우 무시
        }
      };

      window.addEventListener('hashchange', handleHashChange);
      handleHashChange(); // 초기 로드시 확인

      return () => {
        window.removeEventListener('hashchange', handleHashChange);
      };
    }
  }, [isMounted]);

  // OBS 최적화 실시간 동기화 (데이터 정합성 보장)
  useEffect(() => {
    if (!isMounted) return;
    const STORAGE_KEY = 'subtitle_sync_data';
    
    // 데이터 정합성을 위한 상태 추적
    let lastUpdateTimestamp = 0;
    let lastDataHash = '';
    let isUpdating = false;
    
    const generateDataHash = (original: string, translated: string, listening: boolean) => {
      return `${original}_${translated}_${listening}`;
    };
    
    const updateDisplayData = (originalText: string, translatedText: string, isListening: boolean, source: string) => {
      const newHash = generateDataHash(originalText, translatedText, isListening);
      
      // 같은 데이터면 업데이트 건너뛰기 (깜빡임 방지)
      if (newHash === lastDataHash) {
        console.log(`🚫 [${source}] 동일한 데이터 - 업데이트 건너뛰기:`, newHash);
        return false;
      }
      
      console.log(`🔄 [${source}] 데이터 업데이트:`, { originalText, translatedText, isListening });
      addDebugInfo(`[${source}] 업데이트: "${translatedText}" (듣기: ${isListening})`);
      
      // 상태 업데이트 (배치로 처리)
      setOriginalText(prev => prev !== originalText ? originalText : prev);
      setTranslatedText(prev => prev !== translatedText ? translatedText : prev);
      setIsListening(prev => prev !== isListening ? isListening : prev);
      
      // 텍스트가 있으면 표시하고 디졸브 타이머 시작
      const hasText = (originalText && originalText.trim()) || (translatedText && translatedText.trim());
      
      if (hasText) {
        setShouldShow(true);
        setLastTextUpdate(Date.now());
        startDissolveTimer();
      } else if (!isListening) {
        // 음성인식이 꺼지면 즉시 숨김
        setShouldShow(false);
        clearDissolveTimer();
      }
      
      lastDataHash = newHash;
      lastUpdateTimestamp = Date.now();
      
      return true;
    };
    
    // SSE 연결 설정 (Edge Requests 대폭 절약!)
    let eventSource: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;
    
    const setupSSE = () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('sessionId');
      
      if (!sessionId) {
        console.log('SessionId 없음 - localStorage 폴백으로 전환');
        setupFallback();
        return;
      }
      
      console.log('🚀 SSE 연결 시작 (Edge Requests 90% 절약!)');
      
      eventSource = new EventSource(`/api/subtitle-events?sessionId=${sessionId}`);
      
      eventSource.onopen = () => {
        console.log('✅ SSE 연결 성공');
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'SUBTITLE_UPDATE') {
            console.log('📡 SSE 데이터 수신:', data);
            
            if (data.timestamp > lastUpdateTimestamp) {
              updateDisplayData(
                data.originalText || '',
                data.translatedText || '',
                data.isListening || false,
                'SSE'
              );
            }
          }
        } catch (error) {
          console.error('SSE 데이터 파싱 오류:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.warn('SSE 연결 오류, 폴백으로 전환:', error);
        eventSource?.close();
        setupFallback();
      };
    };
    
    const setupFallback = () => {
      console.log('📡 폴백 모드 시작 (제한적 폴링)');
      
      const loadDataFallback = async () => {
        if (isUpdating) return;
        isUpdating = true;
        
        try {
          const params = new URLSearchParams(window.location.search);
          const sessionId = params.get('sessionId');
          
          if (sessionId) {
            try {
              const response = await fetch(`/api/subtitle-status?sessionId=${sessionId}`, {
                method: 'GET',
                headers: { 'Cache-Control': 'no-cache' }
              });
              
              if (response.ok) {
                const result = await response.json();
                const data = result.data;
                
                if (data && data.timestamp > lastUpdateTimestamp) {
                  updateDisplayData(
                    data.originalText || '',
                    data.translatedText || '',
                    data.isListening || false,
                    'API_FALLBACK'
                  );
                }
              }
            } catch (apiError) {
              console.log('API 폴백도 실패, localStorage 사용');
            }
          }

          // localStorage 폴백 (최후 수단)
          try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
              const data: SubtitleData = JSON.parse(stored);
              
              if (data.timestamp > lastUpdateTimestamp) {
                updateDisplayData(
                  data.originalText || '',
                  data.translatedText || '',
                  data.isListening || false,
                  'localStorage'
                );
              }
            }
          } catch (storageError) {
            console.log('localStorage 폴백도 실패');
          }
        } finally {
          isUpdating = false;
        }
      };
      
      // 폴백 모드에서는 간격을 늘려서 Edge Requests 절약 (2초 → 5초)
      fallbackInterval = setInterval(loadDataFallback, 5000);
    };

    // PostMessage 리스너 (우선순위 높음)
    const handlePostMessage = (event: MessageEvent) => {
      try {
        if (event.data && event.data.type === 'SUBTITLE_UPDATE' && event.data.timestamp) {
          const data = event.data;
          
          // 최신 데이터인지 확인
          if (data.timestamp > lastUpdateTimestamp) {
            updateDisplayData(
              data.originalText || '',
              data.translatedText || '',
              data.isListening || false,
              'PostMessage'
            );
          }
        }
      } catch (error) {
        addDebugInfo(`PostMessage 오류: ${(error as Error).message}`);
      }
    };

    // storage 이벤트 리스너 (동일 브라우저 내 탭 동기화)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && !isUpdating) {
        loadData();
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('message', handlePostMessage);

    // 즉시 로드
    loadData();

    // SSE 우선 시도, 실패 시 폴링으로 폴백 (Edge Requests 90% 절약!)
    setupSSE();
    addDebugInfo('SSE 연결 시도 (Edge Requests 대폭 절약)');

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('message', handlePostMessage);
      
      // SSE 연결 종료
      if (eventSource) {
        eventSource.close();
      }
      
      // 폴백 인터벌 종료
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, [isMounted, isOBS]);

  // RGBA 변환
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // 디졸브 타이머 관리
  const startDissolveTimer = () => {
    // 기존 타이머 클리어
    if (dissolveTimer) {
      clearTimeout(dissolveTimer);
      setDissolveTimer(null);
    }
    
    // 디졸브 기능이 비활성화되었거나 음성인식이 꺼져있으면 타이머 시작하지 않음
    if (!enableAutoDissolve || !isListening) {
      return;
    }
    
    // 텍스트가 있을 때만 타이머 시작
    if ((originalText && originalText.trim()) || (translatedText && translatedText.trim())) {
      const timer = setTimeout(() => {
        console.log(`⏰ ${autoDissolveTime}초 경과 - 자동 디졸브 실행`);
        setShouldShow(false);
        addDebugInfo('자동 디졸브 실행됨');
      }, autoDissolveTime * 1000);
      
      setDissolveTimer(timer);
      addDebugInfo(`디졸브 타이머 시작: ${autoDissolveTime}초`);
    }
  };
  
  const clearDissolveTimer = () => {
    if (dissolveTimer) {
      clearTimeout(dissolveTimer);
      setDissolveTimer(null);
      addDebugInfo('디졸브 타이머 클리어됨');
    }
  };

  // OBS 최적화된 텍스트 결정 (수정된 로직)
  const getDisplayText = () => {
    // 디졸브로 숨겨진 상태면 빈 문자열 반환
    if (!shouldShow) {
      return '';
    }
    
    // OBS에서는 로깅을 최소화하여 성능 향상
    if (!isOBS) {
      console.log('🎯 텍스트 결정 로직:', {
        shouldShow,
        isListening,
        translatedText,
        originalText
      });
    }
    
    // 번역된 텍스트가 있으면 우선 표시 (완전한 번역만)
    if (translatedText && translatedText.trim() && 
        !translatedText.includes('undefined') && 
        !translatedText.includes('null') &&
        translatedText !== originalText) {
      return translatedText;
    }
    
    // 원본 텍스트가 있으면 표시 (번역 대기 상태)
    if (originalText && originalText.trim() &&
        !originalText.includes('undefined') &&
        !originalText.includes('null')) {
      return originalText;
    }
    
    // 음성인식이 꺼져있으면 관리자 설정 안내 메시지
    if (!isListening) {
      return adminSettings.inactiveMessage;
    }
    
    // ❗ 중요: 음성인식 중에는 텍스트가 없으면 빈 문자열 반환 (메시지 숨김)
    return '';
  };

  // OBS 최적화: 메모이제이션으로 불필요한 재계산 방지
  const displayText = useMemo(() => getDisplayText(), [translatedText, originalText, isListening, adminSettings, shouldShow]);
  const bgColor = useMemo(() => hexToRgba(backgroundColor, opacity), [backgroundColor, opacity]);
  
  // OBS에서는 로깅 최소화
  if (!isOBS) {
    console.log('🎬 최종 렌더링 정보:', {
      displayText,
      bgColor,
      fontSize,
      textColor
    });
  }

  // 마운트되기 전에는 최소한의 UI만 렌더링
  if (!isMounted) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'transparent',
        pointerEvents: 'none'
      }}>
        <div style={{
          position: 'absolute',
          bottom: '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 1)',
          color: '#ffffff',
          fontSize: '24px',
          padding: '16px 24px',
          borderRadius: '8px',
          textAlign: 'center',
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
        }}>
          로딩 중...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'transparent',
      pointerEvents: 'none',
      fontFamily: 'Arial, sans-serif',
      zIndex: 9999
    }}>
      {/* 전역 스타일 주입 */}
      <style dangerouslySetInnerHTML={{
        __html: `
          html, body { margin: 0 !important; padding: 0 !important; background: transparent !important; }
        `
      }} />
      
      {/* OBS 디버그 정보 (URL에 debug=true가 있을 때만 표시) */}
      {isMounted && typeof window !== 'undefined' && window.location.search.includes('debug=true') && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.9)',
          color: '#00ff00',
          fontSize: '12px',
          padding: '10px',
          borderRadius: '5px',
          fontFamily: 'monospace',
          maxWidth: '400px',
          maxHeight: '300px',
          overflow: 'auto',
          pointerEvents: 'auto',
          zIndex: 10000
        }}>
          <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
            DEBUG INFO ({isOBS ? 'OBS' : 'Browser'})
          </div>
          <div style={{ marginBottom: '5px' }}>
            현재: 원본="{originalText}" 번역="{translatedText}" 듣기={isListening ? 'ON' : 'OFF'}
          </div>
          {debugInfo.slice(0, 15).map((info, index) => (
            <div key={index} style={{ fontSize: '10px', opacity: 0.8 }}>
              {info}
            </div>
          ))}
        </div>
      )}

      {/* 자막 표시 - 텍스트가 있을 때만 표시 */}
      {displayText && displayText.trim() && (
      <div style={{
        position: 'absolute',
        bottom: '50px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: bgColor,
        color: textColor,
        fontSize: `${fontSize}px`,
        padding: '16px 24px',
        borderRadius: '8px',
        textAlign: 'center',
        maxWidth: '80%',
        fontWeight: 'bold',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
        border: '2px solid rgba(255,255,255,0.3)',
        lineHeight: '1.4',
        wordBreak: 'keep-all',
        whiteSpace: 'pre-wrap',
        zIndex: 9999
      }}>
        {displayText}
        
        {/* 원본 텍스트 (옵션) */}
        {showOriginal && translatedText && originalText && originalText !== translatedText && (
          <div style={{
            marginTop: '8px',
            fontSize: `${fontSize * 0.8}px`,
            background: 'rgba(0,0,0,0.6)',
            padding: '8px 12px',
            borderRadius: '6px',
            color: '#d1d5db',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            {originalText}
          </div>
        )}
      </div>
      )}
    </div>
  );
}