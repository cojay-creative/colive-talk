'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { webSpeechService } from '../lib/speech';
import { freeTranslationService } from '../lib/translate';
import { syncService } from '../lib/sync';

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentSection, setCurrentSection] = useState('control');
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('대기 중');
  const [showSubtitlePreview, setShowSubtitlePreview] = useState(true);
  
  // 추가 상태들
  const [sourceLanguage, setSourceLanguage] = useState('ko-KR');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [originalText, setOriginalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState('');
  
  // 실시간 동기화를 위한 상태 (오버레이와 동일한 데이터)
  const [syncedOriginalText, setSyncedOriginalText] = useState('');
  const [syncedTranslatedText, setSyncedTranslatedText] = useState('');
  const [syncedIsListening, setSyncedIsListening] = useState(false);
  
  // 중간 결과 처리를 위한 상태
  const [interimText, setInterimText] = useState('');
  const [interimTranslation, setInterimTranslation] = useState('');
  const [translationTimer, setTranslationTimer] = useState<NodeJS.Timeout | null>(null);
  
  // 오버레이 표시 옵션
  const [showOriginalInOverlay, setShowOriginalInOverlay] = useState(false);
  
  // 현재 URL 가져오기
  const [currentOrigin, setCurrentOrigin] = useState('');
  
  // 사용자별 고유 세션 ID
  const [sessionId, setSessionId] = useState('');
  
  // 실시간 번역 설정
  const [realtimeSettings, setRealtimeSettings] = useState({
    enableInterimTranslation: true,    // 중간 결과 번역 활성화
    interimThreshold: 8,                // 중간 번역 시작 글자 수
    autoSegmentLength: 50,              // 자동 분할 길이 (글자 수)
    translationDelay: 1000,             // 번역 지연 시간 (ms)
    autoDissolveTime: 5,                // 자동 디졸브 시간 (초)
    enableAutoDissolve: true,           // 자동 디졸브 활성화
  });

  // 자동 디졸브 타이머
  const [dissolveTimer, setDissolveTimer] = useState<NodeJS.Timeout | null>(null);
  
  // 레이아웃 설정 상태
  const [layoutSettings, setLayoutSettings] = useState({
    fontSize: 24,
    backgroundColor: '#000000',
    textColor: '#ffffff',
    opacity: 1,
    borderRadius: 8,
    padding: 16,
    margin: 32,
    textAlign: 'center' as const
  });
  
  // 자동 디졸브 타이머 관리
  const resetDissolveTimer = useCallback((hasText: boolean = false, listening: boolean = false) => {
    // 기존 타이머 클리어
    if (dissolveTimer) {
      clearTimeout(dissolveTimer);
      setDissolveTimer(null);
    }

    // 자동 디졸브 조건 확인:
    // 1. 자동 디졸브가 활성화되어 있고
    // 2. 디졸브 시간이 설정되어 있고
    // 3. 음성인식이 활성화된 상태이고
    // 4. 표시할 텍스트가 있는 경우에만 타이머 설정
    if (realtimeSettings.enableAutoDissolve && 
        realtimeSettings.autoDissolveTime > 0 && 
        listening && 
        hasText) {
      
      console.log(`⏰ ${realtimeSettings.autoDissolveTime}초 후 디졸브 타이머 시작`);
      
      const timer = setTimeout(async () => {
        console.log(`⏰ ${realtimeSettings.autoDissolveTime}초 후 자동 디졸브 실행`);
        
        // 디졸브 시 빈 텍스트로 업데이트 (안내 메시지가 표시됨)
        setSyncedOriginalText('');
        setSyncedTranslatedText('');
        setOriginalText('');
        setTranslatedText('');
        
        // API로도 전송하여 OBS 동기화 (음성인식은 계속 활성 상태로 유지)
        if (sessionId) {
          try {
            await fetch('/api/subtitle-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId,
                originalText: '',
                translatedText: '',
                isListening: true, // 음성인식은 계속 활성 상태
                isTranslating: false
              })
            });
            console.log('✅ 디졸브 API 전송 완료 (음성인식 유지)');
          } catch (error) {
            console.error('❌ 디졸브 API 전송 실패:', error);
          }
        }
      }, realtimeSettings.autoDissolveTime * 1000);

      setDissolveTimer(timer);
    }
  }, [dissolveTimer, realtimeSettings.enableAutoDissolve, realtimeSettings.autoDissolveTime, sessionId]);

  // API 기반 동기화 함수
  const updateSubtitles = useCallback(async (originalText: string, translatedText: string, isListening: boolean, isTranslating: boolean) => {
    console.log('🔄 자막 업데이트:', { originalText, translatedText, isListening, isTranslating });
    
    // 음성인식이 중지되면 즉시 텍스트 클리어
    if (!isListening) {
      console.log('🛑 음성인식 중지 - 즉시 텍스트 클리어');
      originalText = '';
      translatedText = '';
      
      // 로컬 상태도 즉시 클리어
      setOriginalText('');
      setTranslatedText('');
      setSyncedOriginalText('');
      setSyncedTranslatedText('');
      
      // 디졸브 타이머도 클리어
      if (dissolveTimer) {
        clearTimeout(dissolveTimer);
        setDissolveTimer(null);
      }
    } else {
      // 음성인식이 활성화된 상태에서 텍스트가 있으면 디졸브 타이머 시작
      const hasText = !!(originalText || translatedText);
      resetDissolveTimer(hasText, isListening);
    }
    
    const updateData = {
      originalText,
      translatedText,
      isListening,
      isTranslating,
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      status: isTranslating ? '번역 중' : '완료'
    };
    
    // 1. syncService를 통한 localStorage 동기화
    try {
      syncService.updateData(updateData);
      console.log('✅ syncService 업데이트 완료');
    } catch (error) {
      console.error('❌ syncService 업데이트 실패:', error);
    }

    // 2. API 서버에 데이터 전송 (OBS용) - 재시도 로직 포함
    const sendToAPI = async (retryCount = 0) => {
      try {
        if (!sessionId) {
          console.warn('⚠️ 세션 ID가 없어서 API 전송 건너뜀');
          return false;
        }
        
        const response = await fetch('/api/subtitle-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            ...updateData
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('📡 API 전송 성공:', result);
          return true;
        } else {
          console.warn('⚠️ API 전송 실패:', response.status);
          return false;
        }
      } catch (error) {
        console.error('❌ API 전송 오류:', error);
        return false;
      }
    };

    // 최대 2번 재시도
    let success = await sendToAPI();
    if (!success && updateData.translatedText) { // 번역된 텍스트가 있을 때만 재시도
      console.log('🔄 API 전송 재시도...');
      await new Promise(resolve => setTimeout(resolve, 200)); // 200ms 대기
      success = await sendToAPI();
      
      if (!success) {
        console.error('❌ API 전송 최종 실패 - OBS 동기화 안될 수 있음');
      }
    }

    // 3. PostMessage를 통한 브로드캐스트 (브라우저 호환성)
    try {
      const postMessageData = {
        type: 'SUBTITLE_UPDATE',
        ...updateData,
        timestamp: Date.now()
      };
      
      // 모든 프레임에 메시지 전송
      window.postMessage(postMessageData, '*');
      
      // 만약 iframe이 있다면 그것들에도 전송
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          iframe.contentWindow?.postMessage(postMessageData, '*');
        } catch (e) {
          // Cross-origin 제한으로 인한 에러는 무시
        }
      });
      
      console.log('📡 PostMessage 브로드캐스트 완료');
    } catch (error) {
      console.error('❌ PostMessage 전송 실패:', error);
    }
  }, [sourceLanguage, targetLanguage, sessionId]);

  // 중간 결과 번역 함수 (디바운스 적용)
  const handleInterimTranslation = useCallback(async (text: string) => {
    if (!realtimeSettings.enableInterimTranslation) return;
    if (text.length < realtimeSettings.interimThreshold) return;

    console.log('🔄 중간 결과 번역:', text);
    setInterimText(text);

    // 기존 타이머 클리어
    if (translationTimer) {
      clearTimeout(translationTimer);
    }

    // 새 타이머 설정 (디바운스)
    const newTimer = setTimeout(async () => {
      try {
        setIsTranslating(true);
        console.log('🌍 중간 번역 시작:', text);
        
        const translated = await freeTranslationService.translate(text, targetLanguage, 'ko');
        console.log('🌍 중간 번역 완료:', translated);
        
        setInterimTranslation(translated);
        
        // 중간 번역 결과도 완전한 형태로만 API 전송
        console.log('📡 중간 번역 결과를 API에 전송:', { text, translated: `${translated} ⚡` });
        updateSubtitles(text, `${translated} ⚡`, isListening, false); // isTranslating을 false로 변경
        
      } catch (error) {
        console.error('❌ 중간 번역 실패:', error);
      } finally {
        setIsTranslating(false);
      }
    }, realtimeSettings.translationDelay);

    setTranslationTimer(newTimer);
  }, [targetLanguage, realtimeSettings, translationTimer, isListening, updateSubtitles]);

  // 긴 문장 자동 분할 처리
  const handleAutoSegmentation = useCallback(async (text: string) => {
    if (text.length > realtimeSettings.autoSegmentLength) {
      // 마지막 완성된 문장까지 찾기
      const sentences = text.split(/[.!?。！？]/);
      if (sentences.length > 1) {
        const completeSentence = sentences.slice(0, -1).join('.') + '.';
        console.log('🔪 문장 자동 분할:', completeSentence);
        
        // 완성된 부분만 번역
        try {
          setIsTranslating(true);
          const translated = await freeTranslationService.translate(completeSentence, targetLanguage, 'ko');
          
          setOriginalText(completeSentence);
          setTranslatedText(translated);
          
          // 자동 분할 번역 완료 후에만 API 전송
          console.log('📡 자동 분할 번역 결과를 API에 전송:', { completeSentence, translated });
          updateSubtitles(completeSentence, translated, isListening, false);
          
        } catch (error) {
          console.error('❌ 자동 분할 번역 실패:', error);
        } finally {
          setIsTranslating(false);
        }
      }
    }
  }, [targetLanguage, realtimeSettings.autoSegmentLength, isListening, updateSubtitles]);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin);
      
      // 고유한 세션 ID 생성 또는 기존 세션 복구
      let userSessionId = localStorage.getItem('colive_session_id');
      if (!userSessionId) {
        userSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('colive_session_id', userSessionId);
        console.log('🆔 새 세션 ID 생성:', userSessionId);
      } else {
        console.log('🆔 기존 세션 ID 복구:', userSessionId);
      }
      setSessionId(userSessionId);
    }
  }, []);
  
  // 컴포넌트 정리 시 타이머 해제
  useEffect(() => {
    return () => {
      if (dissolveTimer) {
        clearTimeout(dissolveTimer);
      }
      if (translationTimer) {
        clearTimeout(translationTimer);
      }
    };
  }, [dissolveTimer, translationTimer]);

  useEffect(() => {
    console.log('🎯 Home 컴포넌트 마운트 완료');
    
    try {
      // syncService를 컨트롤러로 설정
      syncService.setAsController(true);
      console.log('🎮 syncService 컨트롤러 모드 활성화');
      
      // 음성 인식 서비스 초기화
      webSpeechService.onResult((text: string) => {
        console.log('🎤 최종 음성 인식 결과:', text);
        setOriginalText(text);
        setStatus('번역 중...');
        setIsTranslating(true);
        
        // 중간 번역 타이머 클리어 (최종 결과이므로)
        if (translationTimer) {
          clearTimeout(translationTimer);
          setTranslationTimer(null);
        }
        
        // 번역 중에는 로컬 상태만 업데이트 (API 전송 안함)
        // updateSubtitles(text, '', isListening, true); // 제거: 중간 상태 전송 방지
        
        // 자동 번역
        freeTranslationService.translate(text, targetLanguage, 'ko')
          .then((translated) => {
            console.log('🌍 번역 결과:', translated);
            setTranslatedText(translated);
            setIsTranslating(false);
            setStatus('번역 완료');
            
            // ✅ 번역 완료 후에만 API 전송 (최종 상태만)
            console.log('📡 최종 번역 결과를 API에 전송:', { text, translated });
            updateSubtitles(text, translated, isListening, false);
          })
          .catch((error) => {
            console.error('번역 오류:', error);
            setError('번역에 실패했습니다.');
            setIsTranslating(false);
            setStatus('번역 실패');
            
            // 동기화 서비스에 오류 상태 업데이트
            syncService.updateData({
              originalText: text,
              translatedText: '',
              isTranslating: false,
              status: '번역 실패',
              error: '번역에 실패했습니다.',
              sourceLanguage: sourceLanguage,
              targetLanguage: targetLanguage,
              isListening: isListening
            });
          });
      });

      // 중간 결과 처리 (실시간 번역)
      webSpeechService.onInterimResult((text: string) => {
        console.log('🔄 중간 음성 인식 결과:', text);
        
        // 자동 분할 처리
        handleAutoSegmentation(text);
        
        // 중간 번역 처리
        handleInterimTranslation(text);
      });

      webSpeechService.onError((error: string) => {
        console.error('🚨 음성 인식 오류:', error);
        setError(`음성 인식 오류: ${error}`);
        setStatus('오류 발생');
        setIsListening(false);
        
        // 동기화 서비스에 오류 상태 업데이트
        syncService.updateData({
          error: `음성 인식 오류: ${error}`,
          status: '오류 발생',
          isListening: false,
          sourceLanguage: sourceLanguage,
          targetLanguage: targetLanguage
        });
      });

      webSpeechService.onStatus((status: string) => {
        console.log('📊 음성 인식 상태:', status);
        setStatus(status);
        
        // 동기화 서비스에 상태 업데이트
        syncService.updateData({
          status: status,
          sourceLanguage: sourceLanguage,
          targetLanguage: targetLanguage,
          isListening: isListening
        });
      });
    } catch (error) {
      console.error('초기화 오류:', error);
      setError('서비스 초기화에 실패했습니다.');
      setStatus('초기화 실패');
    }

    const timer = setTimeout(() => {
      setStatus('준비 완료');
      console.log('✅ 상태 업데이트 성공');
      
      // 동기화 서비스에 초기 상태 업데이트
      console.log('🔄 초기 상태 동기화 서비스 업데이트');
      syncService.updateData({
        status: '준비 완료',
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
        isListening: isListening,
        originalText: originalText,
        translatedText: translatedText,
        isTranslating: isTranslating
      });
    }, 1000);

    return () => {
      clearTimeout(timer);
      try {
        webSpeechService.stop();
        syncService.setAsController(false);
      } catch (error) {
        console.error('정리 중 오류:', error);
      }
      console.log('🎯 Home 컴포넌트 언마운트');
    };
  }, [targetLanguage, sourceLanguage, isListening, handleAutoSegmentation, handleInterimTranslation, translationTimer, updateSubtitles]);

  // localStorage 실시간 동기화 (미리보기용)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const STORAGE_KEY = 'subtitle_sync_data';
    
    const loadSyncData = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          console.log('🔄 미리보기 동기화 데이터 수신:', {
            originalText: data.originalText,
            translatedText: data.translatedText,
            isListening: data.isListening
          });
          
          setSyncedOriginalText(data.originalText || '');
          setSyncedTranslatedText(data.translatedText || '');
          setSyncedIsListening(data.isListening || false);
        }
      } catch (error) {
        console.error('❌ 미리보기 동기화 데이터 로드 실패:', error);
      }
    };

    // 즉시 로드
    loadSyncData();

    // storage 이벤트 리스너 (다른 탭에서 변경시)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        console.log('🔄 미리보기 storage 이벤트 감지');
        loadSyncData();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // 빠른 폴링으로 같은 탭 내 변경사항도 감지
    const interval = setInterval(loadSyncData, 100);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);


  const toggleListening = useCallback(() => {
    console.log('🎤 음성 인식 토글:', !isListening);
    
    if (!isListening) {
      // 음성 인식 시작
      setError('');
      setOriginalText('');
      setTranslatedText('');
      
      const success = webSpeechService.start(sourceLanguage);
      if (success) {
        setIsListening(true);
        setStatus('🎤 음성 인식 시작 중...');
        
        // 음성 인식 시작 동기화
        updateSubtitles('', '', true, false);
      } else {
        setError('음성 인식을 시작할 수 없습니다. 브라우저에서 마이크 권한을 허용해주세요.');
        setStatus('음성 인식 시작 실패');
        
        // 동기화 서비스에 오류 상태 업데이트
        syncService.updateData({
          isListening: false,
          status: '음성 인식 시작 실패',
          error: '음성 인식을 시작할 수 없습니다. 브라우저에서 마이크 권한을 허용해주세요.',
          sourceLanguage: sourceLanguage,
          targetLanguage: targetLanguage
        });
      }
    } else {
      // 음성 인식 중지
      webSpeechService.stop();
      setIsListening(false);
      setStatus('음성 인식 중지됨');
      
      // 음성 인식 중지 동기화
      updateSubtitles(originalText, translatedText, false, false);
    }
  }, [isListening, sourceLanguage, targetLanguage, originalText, translatedText, updateSubtitles]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(!isDarkMode);
  }, [isDarkMode]);

  const clearTexts = useCallback(() => {
    if (originalText || translatedText) {
      if (confirm('모든 텍스트를 지우시겠습니까?')) {
        setOriginalText('');
        setTranslatedText('');
        setError('');
        setStatus('텍스트 지워짐');
      }
    }
  }, [originalText, translatedText]);

  const copyToClipboard = useCallback(async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(message);
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
      setError('클립보드 복사에 실패했습니다.');
    }
  }, []);

  console.log('🎯 렌더링 상태:', { isDarkMode, currentSection, isListening, status });

  return (
    <ErrorBoundary>
      <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* 헤더 - 고정 */}
      <Header 
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        showSubtitlePreview={showSubtitlePreview}
        setShowSubtitlePreview={setShowSubtitlePreview}
        isListening={isListening}
        toggleListening={toggleListening}
        status={status}
      />

      {/* 메인 레이아웃 - 고정 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 왼쪽 사이드바 - 고정 */}
        <Sidebar
          isDarkMode={isDarkMode}
          currentSection={currentSection}
          setCurrentSection={setCurrentSection}
        />

        {/* 메인 콘텐츠 - 스크롤 가능 */}
        <main className="flex-1 overflow-y-auto">
          {/* 자막 미리보기 섹션 - 조건부 렌더링 */}
          {showSubtitlePreview && (
            <div className={`sticky top-0 z-10 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b px-4 py-3`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                🎬 자막 미리보기
              </h3>
              <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {syncedIsListening ? (
                  <span className="text-green-500 font-medium">🔴 녹음 중</span>
                ) : (
                  <span className="text-gray-500">⏸️ 대기 중</span>
                )}
              </div>
            </div>
            
            <div className="bg-black rounded-lg min-h-[120px] flex items-center justify-center p-4 border border-gray-700">
              <div className="text-center w-full">
                <div 
                  className="inline-block font-bold border-2 border-white/30"
                  style={{
                    backgroundColor: layoutSettings.backgroundColor.startsWith('#') 
                      ? `${layoutSettings.backgroundColor}${Math.round(layoutSettings.opacity * 255).toString(16).padStart(2, '0')}`
                      : layoutSettings.backgroundColor,
                    color: layoutSettings.textColor,
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    fontSize: `${layoutSettings.fontSize}px`,
                    lineHeight: '1.4',
                    padding: `${layoutSettings.padding}px`,
                    borderRadius: `${layoutSettings.borderRadius}px`
                  }}
                >
                  {syncedTranslatedText ? (
                    <>
                      {syncedTranslatedText}
                      {showOriginalInOverlay && syncedOriginalText && syncedOriginalText !== syncedTranslatedText && (
                        <div 
                          className="mt-2 border border-white/20"
                          style={{
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            color: '#d1d5db',
                            fontSize: `${layoutSettings.fontSize * 0.8}px`,
                            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                            padding: `${layoutSettings.padding * 0.5}px`,
                            borderRadius: `${layoutSettings.borderRadius}px`
                          }}
                        >
                          {syncedOriginalText}
                        </div>
                      )}
                    </>
                  ) : syncedOriginalText ? (
                    syncedOriginalText
                  ) : !syncedIsListening ? (
                    '안녕하세요! 음성인식을 시작해주세요 🎤'
                  ) : (
                    '음성을 듣고 있습니다...'
                  )}
                </div>
              </div>
            </div>
            </div>
          )}

          {/* 메인 콘텐츠 내용 */}
          <div className="p-4">
            {currentSection === 'control' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  음성 인식 컨트롤
                </h1>
              </div>

              {/* 에러 표시 */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <span className="text-red-500 mr-2">⚠️</span>
                    <span className="text-red-700 text-sm">{error}</span>
                    <button
                      onClick={() => setError('')}
                      className="ml-auto text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* 마이크 설정 */}
              <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 shadow-sm border transition-all duration-300`}>
                <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>🎤 마이크 설정</h3>
                
                <div className="flex space-x-4">
                  <button
                    onClick={toggleListening}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      isListening
                        ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-md'
                        : 'bg-[#00B1A9] hover:bg-[#008F87] text-white shadow-md hover:shadow-lg'
                    }`}
                  >
                    {isListening ? '🎤 인식 중지' : '🎤 인식 시작'}
                  </button>
                  
                  <button
                    onClick={toggleDarkMode}
                    className={`p-2 rounded-lg transition-all duration-300 ${
                      isDarkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                    title={isDarkMode ? '라이트모드로 전환' : '다크모드로 전환'}
                  >
                    {isDarkMode ? '☀️' : '🌙'}
                  </button>

                  <button
                    onClick={clearTexts}
                    className="py-3 px-6 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    🗑️ 텍스트 지우기
                  </button>
                </div>
                
                <div className="mt-4 p-4 rounded-lg border bg-[#00B1A9]/5 border-[#00B1A9]/20">
                  <div className="text-sm text-[#00B1A9]">
                    💡 <strong>현재 상태:</strong> {status}
                  </div>
                </div>
              </div>

              {/* 텍스트 표시 영역 */}
              {originalText && (
                <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 shadow-sm border transition-all duration-300`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>🎯 원본 텍스트:</div>
                    <button
                      onClick={() => copyToClipboard(originalText, '원본 텍스트가 복사되었습니다!')}
                      className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      복사
                    </button>
                  </div>
                  <div className={`text-lg p-4 rounded-lg border transition-all duration-300 ${
                    isDarkMode 
                      ? 'text-gray-200 bg-gray-700 border-gray-600' 
                      : 'text-gray-800 bg-gray-50 border-gray-200'
                  }`}>
                    {originalText}
                  </div>
                </div>
              )}

              {translatedText && (
                <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 shadow-sm border transition-all duration-300`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className={`text-sm ${isDarkMode ? 'text-[#00B1A9]' : 'text-[#00B1A9]'}`}>🌍 번역된 텍스트:</div>
                    <button
                      onClick={() => copyToClipboard(translatedText, '번역된 텍스트가 복사되었습니다!')}
                      className="text-xs px-2 py-1 bg-[#00B1A9] text-white rounded hover:bg-[#008F87] transition-colors"
                    >
                      복사
                    </button>
                  </div>
                  <div className={`text-lg font-medium p-4 rounded-lg border transition-all duration-300 ${
                    isDarkMode 
                      ? 'text-gray-200 bg-[#00B1A9]/10 border-[#00B1A9]/20' 
                      : 'text-gray-800 bg-[#00B1A9]/5 border-[#00B1A9]/20'
                  }`}>
                    {translatedText}
                  </div>
                </div>
              )}

              {/* 상태 표시 */}
              <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 shadow-sm border transition-all duration-300`}>
                <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>📊 시스템 상태</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
                    <div className="text-sm mb-2">음성 인식:</div>
                    <div className={`text-lg font-medium ${isListening ? 'text-green-500' : 'text-red-500'}`}>
                      {isListening ? '🟢 활성' : '🔴 비활성'}
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
                    <div className="text-sm mb-2">테마:</div>
                    <div className="text-lg font-medium text-gray-700">
                      {isDarkMode ? '🌙 다크' : '☀️ 라이트'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentSection === 'realtime' && (
            <div className="space-y-6">
              <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>실시간 설정</h1>
              
              {/* 실시간 번역 설정 */}
              <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 shadow-sm border transition-all duration-300`}>
                <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>⚡ 실시간 번역 설정</h3>
                <div className="space-y-4">
                  
                  {/* 중간 번역 활성화 */}
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="enableInterimTranslation"
                      checked={realtimeSettings.enableInterimTranslation}
                      onChange={(e) => setRealtimeSettings(prev => ({
                        ...prev,
                        enableInterimTranslation: e.target.checked
                      }))}
                      className="rounded focus:ring-[#00B1A9] text-[#00B1A9]"
                    />
                    <label htmlFor="enableInterimTranslation" className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      실시간 중간 번역 활성화 (말하는 도중에도 번역)
                    </label>
                  </div>
                  
                  {/* 중간 번역 임계값 */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      중간 번역 시작 글자 수: {realtimeSettings.interimThreshold}글자
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="20"
                      value={realtimeSettings.interimThreshold}
                      onChange={(e) => setRealtimeSettings(prev => ({
                        ...prev,
                        interimThreshold: parseInt(e.target.value)
                      }))}
                      className="w-full accent-[#00B1A9]"
                    />
                    <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      이 글자 수 이상 말하면 중간 번역을 시작합니다
                    </div>
                  </div>
                  
                  {/* 자동 분할 길이 */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      장문 자동 분할 길이: {realtimeSettings.autoSegmentLength}글자
                    </label>
                    <input
                      type="range"
                      min="30"
                      max="100"
                      value={realtimeSettings.autoSegmentLength}
                      onChange={(e) => setRealtimeSettings(prev => ({
                        ...prev,
                        autoSegmentLength: parseInt(e.target.value)
                      }))}
                      className="w-full accent-[#00B1A9]"
                    />
                    <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      이 글자 수가 넘으면 문장을 자동으로 분할해서 번역합니다
                    </div>
                  </div>
                  
                  {/* 번역 지연 시간 */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      번역 지연 시간: {realtimeSettings.translationDelay}ms
                    </label>
                    <input
                      type="range"
                      min="500"
                      max="3000"
                      step="100"
                      value={realtimeSettings.translationDelay}
                      onChange={(e) => setRealtimeSettings(prev => ({
                        ...prev,
                        translationDelay: parseInt(e.target.value)
                      }))}
                      className="w-full accent-[#00B1A9]"
                    />
                    <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      말을 멈춘 후 번역을 시작하기까지의 대기 시간입니다
                    </div>
                  </div>
                </div>
              </div>

              {/* 자동 디졸브 설정 */}
              <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 shadow-sm border transition-all duration-300`}>
                <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>⏰ 자동 디졸브 설정</h3>
                <div className="space-y-4">
                  
                  {/* 자동 디졸브 활성화 */}
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="enableAutoDissolve"
                      checked={realtimeSettings.enableAutoDissolve}
                      onChange={(e) => setRealtimeSettings(prev => ({
                        ...prev,
                        enableAutoDissolve: e.target.checked
                      }))}
                      className="rounded focus:ring-[#00B1A9] text-[#00B1A9]"
                    />
                    <label htmlFor="enableAutoDissolve" className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      자동 디졸브 활성화 (일정 시간 후 자막 사라짐)
                    </label>
                  </div>
                  
                  {/* 디졸브 시간 설정 */}
                  <div className={realtimeSettings.enableAutoDissolve ? '' : 'opacity-50 pointer-events-none'}>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      자동 디졸브 시간: {realtimeSettings.autoDissolveTime}초
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="30"
                      value={realtimeSettings.autoDissolveTime}
                      onChange={(e) => setRealtimeSettings(prev => ({
                        ...prev,
                        autoDissolveTime: parseInt(e.target.value)
                      }))}
                      className="w-full accent-[#00B1A9]"
                      disabled={!realtimeSettings.enableAutoDissolve}
                    />
                    <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      음성이 입력되지 않은 후 이 시간이 지나면 자막이 사라집니다
                    </div>
                  </div>
                  
                  {/* 설명 */}
                  <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                    <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-blue-800'}`}>
                      <strong>💡 디졸브 기능 설명:</strong>
                      <ul className="mt-2 space-y-1 list-disc list-inside">
                        <li>음성 입력이 없으면 설정한 시간 후에 자막이 자동으로 사라집니다</li>
                        <li>음성 인식을 중지하면 즉시 관리자가 설정한 안내 메시지가 표시됩니다</li>
                        <li>새로운 음성이 입력되면 타이머가 다시 시작됩니다</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* 종합 설명 */}
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-green-50'}`}>
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-green-800'}`}>
                  <strong>⚡ 실시간 설정 활용 팁:</strong>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>실시간 번역을 켜면 말하는 도중에도 번역이 나타납니다</li>
                    <li>지연 시간을 짧게 하면 더 빠르지만 불완전한 번역이 나올 수 있습니다</li>
                    <li>장문 자동 분할로 긴 문장을 끊어서 번역할 수 있습니다</li>
                    <li>자동 디졸브로 깔끔한 스트리밍을 위해 오래된 자막을 자동 제거할 수 있습니다</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

            {currentSection === 'layout' && (
            <div className="space-y-6">
              <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>레이아웃 설정</h1>
              
              <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 shadow-sm border transition-all duration-300`}>
                <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>📺 오버레이 스타일</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>폰트 크기</label>
                    <input
                      type="range"
                      min="16"
                      max="48"
                      value={layoutSettings.fontSize}
                      onChange={(e) => {
                        const fontSize = parseInt(e.target.value);
                        const newSettings = { ...layoutSettings, fontSize };
                        setLayoutSettings(newSettings);
                        syncService.updateLayoutSettings({ fontSize });
                      }}
                      className="w-full"
                    />
                    <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{layoutSettings.fontSize}px</div>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>배경 색상</label>
                    <input
                      type="color"
                      value={layoutSettings.backgroundColor}
                      onChange={(e) => {
                        const backgroundColor = e.target.value;
                        const newSettings = { ...layoutSettings, backgroundColor };
                        setLayoutSettings(newSettings);
                        syncService.updateLayoutSettings({ backgroundColor });
                      }}
                      className="w-full h-10 rounded border"
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>텍스트 색상</label>
                    <input
                      type="color"
                      value={layoutSettings.textColor}
                      onChange={(e) => {
                        const textColor = e.target.value;
                        const newSettings = { ...layoutSettings, textColor };
                        setLayoutSettings(newSettings);
                        syncService.updateLayoutSettings({ textColor });
                      }}
                      className="w-full h-10 rounded border"
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>투명도</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={layoutSettings.opacity}
                      onChange={(e) => {
                        const opacity = parseFloat(e.target.value);
                        const newSettings = { ...layoutSettings, opacity };
                        setLayoutSettings(newSettings);
                        syncService.updateLayoutSettings({ opacity });
                      }}
                      className="w-full"
                    />
                    <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{Math.round(layoutSettings.opacity * 100)}%</div>
                  </div>
                </div>
              </div>
            </div>
          )}

            {currentSection === 'settings' && (
            <div className="space-y-6">
              <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>언어 설정</h1>
              
              <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 shadow-sm border transition-all duration-300`}>
                <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>🌍 언어 설정</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>원본 언어 (음성 인식)</label>
                    <select
                      value={sourceLanguage}
                      onChange={(e) => {
                        setSourceLanguage(e.target.value);
                        // 동기화 서비스에 언어 설정 업데이트
                        syncService.updateData({
                          sourceLanguage: e.target.value,
                          targetLanguage: targetLanguage,
                          isListening: isListening,
                          status: status
                        });
                      }}
                      className={`w-full border rounded-lg px-3 py-2 transition-all duration-300 ${
                        isDarkMode 
                          ? 'border-gray-600 bg-gray-700 text-white focus:border-[#00B1A9] focus:ring-[#00B1A9]/20' 
                          : 'border-gray-300 bg-white text-gray-800 focus:border-[#00B1A9] focus:ring-[#00B1A9]/20'
                      }`}
                    >
                      <option value="ko-KR">한국어</option>
                      <option value="en-US">English (US)</option>
                      <option value="ja-JP">日本語</option>
                      <option value="zh-CN">中文</option>
                      <option value="es-ES">Español</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>번역 언어 (자막 표시)</label>
                    <select
                      value={targetLanguage}
                      onChange={(e) => {
                        setTargetLanguage(e.target.value);
                        // 동기화 서비스에 언어 설정 업데이트
                        syncService.updateData({
                          sourceLanguage: sourceLanguage,
                          targetLanguage: e.target.value,
                          isListening: isListening,
                          status: status
                        });
                      }}
                      className={`w-full border rounded-lg px-3 py-2 transition-all duration-300 ${
                        isDarkMode 
                          ? 'border-gray-600 bg-gray-700 text-white focus:border-[#00B1A9] focus:ring-[#00B1A9]/20' 
                          : 'border-gray-300 bg-white text-gray-800 focus:border-[#00B1A9] focus:ring-[#00B1A9]/20'
                      }`}
                    >
                      <option value="en">English</option>
                      <option value="ko">한국어</option>
                      <option value="ja">日本語</option>
                      <option value="zh">中文</option>
                      <option value="es">Español</option>
                    </select>
                  </div>
                </div>
              </div>


              <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 shadow-sm border transition-all duration-300`}>
                <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>🎬 오버레이 표시 설정</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        원본 텍스트 표시
                      </label>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        오버레이에 원본 텍스트도 함께 표시합니다
                      </p>
                    </div>
                    <button
                      onClick={() => setShowOriginalInOverlay(!showOriginalInOverlay)}
                      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ${
                        showOriginalInOverlay 
                          ? 'bg-[#00B1A9]' 
                          : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block w-4 h-4 transform transition-transform duration-200 bg-white rounded-full ${
                        showOriginalInOverlay ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  <div className={`text-xs p-3 rounded-lg ${
                    isDarkMode ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-700'
                  }`}>
                    💡 기본적으로는 번역된 텍스트만 표시되며, 이 옵션을 켜면 원본 텍스트도 함께 표시됩니다.
                  </div>
                </div>
              </div>
            </div>
          )}

            {currentSection === 'broadcast' && (
            <div className="space-y-6">
              <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>송출프로그램 연동</h1>
              
              <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 shadow-sm border transition-all duration-300`}>
                <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>📺 OBS/XSplit 오버레이 URL</h3>
                <div className="space-y-4">
                  <div className={`text-sm p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                    💡 아래 URL을 복사하여 OBS나 XSplit의 브라우저 소스에 추가하세요.
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        기본 오버레이 URL (번역된 텍스트만)
                      </label>
                      <div className="flex">
                        <input
                          readOnly
                          value={currentOrigin && sessionId ? `${currentOrigin}/overlay?sessionId=${sessionId}&source=${sourceLanguage}&target=${targetLanguage}&controls=false` : '로딩 중...'}
                          className={`flex-1 p-2 text-sm rounded-l-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-800'}`}
                        />
                        <button
                          onClick={() => copyToClipboard(
                            `${currentOrigin}/overlay?sessionId=${sessionId}&source=${sourceLanguage}&target=${targetLanguage}&controls=false`,
                            '기본 오버레이 URL이 복사되었습니다!'
                          )}
                          className="px-3 py-2 bg-[#00B1A9] text-white text-sm rounded-r-lg hover:bg-[#008F87] transition-colors"
                        >
                          복사
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        원본 포함 오버레이 URL (원본 + 번역)
                      </label>
                      <div className="flex">
                        <input
                          readOnly
                          value={currentOrigin && sessionId ? `${currentOrigin}/overlay?sessionId=${sessionId}&source=${sourceLanguage}&target=${targetLanguage}&controls=false&showOriginal=true` : '로딩 중...'}
                          className={`flex-1 p-2 text-sm rounded-l-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-800'}`}
                        />
                        <button
                          onClick={() => copyToClipboard(
                            `${currentOrigin}/overlay?sessionId=${sessionId}&source=${sourceLanguage}&target=${targetLanguage}&controls=false&showOriginal=true`,
                            '원본 포함 오버레이 URL이 복사되었습니다!'
                          )}
                          className="px-3 py-2 bg-[#00B1A9] text-white text-sm rounded-r-lg hover:bg-[#008F87] transition-colors"
                        >
                          복사
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`text-xs p-3 rounded-lg ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                    <h4 className="font-medium mb-2">📝 사용 방법:</h4>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>OBS Studio → 소스 → 브라우저 추가</li>
                      <li>URL에 위의 링크 붙여넣기</li>
                      <li>폭: 1920, 높이: 1080 권장</li>
                      <li>사용자 정의 CSS로 추가 스타일링 가능</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 shadow-sm border transition-all duration-300`}>
                <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>⚙️ 고급 설정</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      URL 파라미터 옵션
                    </label>
                    <div className={`text-xs space-y-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <div><code>source=ko</code> - 원본 언어 설정</div>
                      <div><code>target=en</code> - 번역 언어 설정</div>
                      <div><code>controls=false</code> - 컨트롤 숨기기</div>
                      <div><code>showOriginal=true</code> - 원본 텍스트 표시</div>
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      권장 브라우저 소스 설정
                    </label>
                    <div className={`text-xs space-y-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <div>폭: 1920px</div>
                      <div>높이: 1080px</div>
                      <div>FPS: 30</div>
                      <div>셧다운 소스 시 브라우저 숨기기: 체크</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

            {currentSection !== 'control' && currentSection !== 'settings' && currentSection !== 'broadcast' && currentSection !== 'layout' && (
            <div className="text-center py-12">
              <h1 className="text-3xl font-bold text-gray-600 mb-4">
                🚧 개발 중...
              </h1>
              <p className="text-gray-500">
                이 기능은 곧 업데이트될 예정입니다.
              </p>
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
    </ErrorBoundary>
  );
}