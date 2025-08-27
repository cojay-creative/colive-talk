'use client';

import React, { useState, useEffect } from 'react';

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

  // 실시간 동기화 - localStorage + PostMessage + 폴링 (OBS 호환)
  useEffect(() => {
    if (!isMounted) return;
    const STORAGE_KEY = 'subtitle_sync_data';
    
    const loadData = async () => {
      // URL에서 sessionId 가져오기
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('sessionId');
      
      // 1. API에서 데이터 로드 시도 (OBS용)
      try {
        if (!sessionId) {
          addDebugInfo('세션 ID가 없어서 API 호출 건너뜀');
          return;
        }
        
        const response = await fetch(`/api/subtitle-status?sessionId=${sessionId}`);
        if (response.ok) {
          const result = await response.json();
          const data = result.data;
          
          if (data && (data.originalText || data.translatedText)) {
            addDebugInfo(`API 데이터: 원본="${data.originalText}" 번역="${data.translatedText}" 듣기=${data.isListening}`);
            
            console.log('📡 API 동기화 데이터 수신:', {
              originalText: data.originalText,
              translatedText: data.translatedText,
              isListening: data.isListening,
              isTranslating: data.isTranslating,
              timestamp: data.timestamp
            });
            
            setOriginalText(data.originalText || '');
            setTranslatedText(data.translatedText || '');
            setIsListening(data.isListening || false);
            return; // API에서 성공적으로 받아왔으면 localStorage 확인 안함
          }
        }
      } catch (error) {
        // API 실패는 조용히 처리하고 localStorage로 폴백
        console.log('API 접근 실패, localStorage로 폴백:', error.message);
      }

      // 2. localStorage에서 데이터 로드 (브라우저용)
      try {
        if (typeof window === 'undefined') return;
        
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data: SubtitleData = JSON.parse(stored);
          
          // 디버그 정보 추가
          addDebugInfo(`localStorage 데이터: 원본="${data.originalText}" 번역="${data.translatedText}" 듣기=${data.isListening}`);
          
          console.log('📦 localStorage 동기화 데이터 수신:', {
            originalText: data.originalText,
            translatedText: data.translatedText,
            isListening: data.isListening,
            isTranslating: data.isTranslating,
            timestamp: data.timestamp
          });
          
          setOriginalText(data.originalText || '');
          setTranslatedText(data.translatedText || '');
          setIsListening(data.isListening || false);
          
          // 레이아웃 설정 업데이트
          if (data.layoutSettings) {
            setFontSize(data.layoutSettings.fontSize || 24);
            setBackgroundColor(data.layoutSettings.backgroundColor || '#000000');
            setTextColor(data.layoutSettings.textColor || '#ffffff');
            setOpacity(data.layoutSettings.opacity || 1);
          }
        } else {
          addDebugInfo('localStorage에 데이터 없음');
        }
      } catch (error) {
        console.error('❌ localStorage 로드 실패:', error);
        addDebugInfo(`localStorage 로드 오류: ${error.message}`);
      }
    };

    // PostMessage 리스너 (OBS 환경에서 주로 사용)
    const handlePostMessage = (event: MessageEvent) => {
      try {
        if (event.data && event.data.type === 'SUBTITLE_UPDATE') {
          const data = event.data;
          addDebugInfo(`PostMessage 데이터: 원본="${data.originalText}" 번역="${data.translatedText}" 듣기=${data.isListening}`);
          
          console.log('📡 PostMessage 동기화 데이터 수신:', {
            originalText: data.originalText,
            translatedText: data.translatedText,
            isListening: data.isListening,
            isTranslating: data.isTranslating
          });
          
          setOriginalText(data.originalText || '');
          setTranslatedText(data.translatedText || '');
          setIsListening(data.isListening || false);
        }
      } catch (error) {
        console.error('❌ PostMessage 처리 실패:', error);
        addDebugInfo(`PostMessage 오류: ${error.message}`);
      }
    };

    // 즉시 로드
    loadData();

    // storage 이벤트 리스너 (브라우저 환경)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        console.log('🔄 storage 이벤트 감지');
        addDebugInfo('Storage 이벤트 감지됨');
        loadData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('message', handlePostMessage);

    // 빠른 폴링으로 강제 동기화 (OBS 호환성)
    const interval = setInterval(loadData, 200);
    
    addDebugInfo(`동기화 시작 - API + localStorage + PostMessage + 200ms 폴링`);
    console.log('🎧 멀티 동기화 리스너 설정 완료 (API우선)');

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('message', handlePostMessage);
      clearInterval(interval);
      console.log('🔌 멀티 동기화 리스너 해제');
    };
  }, [isMounted]);

  // RGBA 변환
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // 표시할 텍스트 결정 (번역 텍스트 우선)
  const getDisplayText = () => {
    console.log('🎯 텍스트 결정 로직:', {
      isListening,
      translatedText,
      originalText,
      translatedTextLength: translatedText?.length,
      originalTextLength: originalText?.length
    });
    
    // 번역된 텍스트가 있으면 우선 표시
    if (translatedText) {
      console.log('→ 번역된 텍스트 표시:', translatedText);
      return translatedText;
    }
    
    // 원본 텍스트가 있으면 표시
    if (originalText) {
      console.log('→ 원본 텍스트 표시:', originalText);
      return originalText;
    }
    
    // 음성인식이 꺼져있으면 관리자 설정 안내 메시지
    if (!isListening) {
      console.log('→ 음성인식 꺼짐: 관리자 안내 메시지 표시');
      return adminSettings.inactiveMessage;
    }
    
    // 기본 대기 메시지 (관리자 설정)
    console.log('→ 기본 대기 메시지 표시 (관리자 설정)');
    return adminSettings.listeningMessage;
  };

  const displayText = getDisplayText();
  const bgColor = hexToRgba(backgroundColor, opacity);
  
  console.log('🎬 최종 렌더링 정보:', {
    displayText,
    bgColor,
    fontSize,
    textColor
  });

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

      {/* 자막 표시 */}
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
    </div>
  );
}