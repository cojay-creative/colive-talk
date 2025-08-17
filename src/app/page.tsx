'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import { webSpeechService } from '../lib/speech';
import { freeTranslationService } from '../lib/translate';
import { syncService } from '../lib/sync';

// 헤더 컴포넌트
interface SimpleHeaderProps {
  isDarkMode: boolean;
  setIsDarkMode: () => void;
  isListening: boolean;
  toggleListening: () => void;
  status: string;
}

const SimpleHeader = memo(({ isDarkMode, setIsDarkMode, isListening, toggleListening, status }: SimpleHeaderProps) => (
  <header className={`${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} shadow-sm border-b transition-colors duration-300`}>
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative w-12 h-12">
            <img 
              src="/main-logo-24.png" 
              alt="COJAY Logo" 
              className="w-12 h-12 rounded-lg shadow-sm object-contain"
            />
          </div>
          <div className="flex flex-col">
            <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Colive Talk
            </h1>
            <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
              실시간 자막 번역 서비스
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* 다크모드 토글 */}
          <button
            onClick={setIsDarkMode}
            className={`p-2 rounded-md transition-all duration-200 ${
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
            title={isDarkMode ? '라이트모드로 전환' : '다크모드로 전환'}
          >
            <span className="text-sm">{isDarkMode ? '☀️' : '🌙'}</span>
          </button>
          
          <button
            onClick={toggleListening}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
              isListening
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-[#00B1A9] hover:bg-[#008F87] text-white'
            }`}
          >
            <span className="text-xs">{isListening ? '🎤 중지' : '🎤 시작'}</span>
          </button>
          
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full transition-colors duration-200 ${
              isListening ? 'bg-green-500' : isDarkMode ? 'bg-gray-500' : 'bg-gray-400'
            }`}></div>
            <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {isListening ? '활성' : '대기'}
            </span>
          </div>
        </div>
      </div>
    </div>
  </header>
));

// 사이드바 컴포넌트
interface SimpleSidebarProps {
  isDarkMode: boolean;
  currentSection: string;
  setCurrentSection: (section: string) => void;
}

const SimpleSidebar = memo(({ isDarkMode, currentSection, setCurrentSection }: SimpleSidebarProps) => {
  const menuItems = [
    { id: 'control', label: '음성 인식 컨트롤', icon: '🎤' },
    { id: 'settings', label: '언어 설정', icon: '🌍' },
    { id: 'layout', label: '레이아웃 설정', icon: '⚙️' },
    { id: 'font', label: '폰트 설정', icon: '✍️' },
    { id: 'background', label: '배경 설정', icon: '🎨' },
    { id: 'broadcast', label: '송출프로그램 연동', icon: '📺' }
  ];

  return (
    <aside className={`w-56 shadow-sm border-r transition-colors duration-300 overflow-y-auto ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="p-4">
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentSection(item.id)}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 text-sm ${
                currentSection === item.id
                  ? isDarkMode 
                    ? 'bg-[#00B1A9]/20 text-[#00B1A9] border border-[#00B1A9]/30'
                    : 'bg-[#00B1A9]/10 text-[#00B1A9] border border-[#00B1A9]/20'
                  : isDarkMode
                    ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
});

export default function Home() {
  console.log('🎯 Home 컴포넌트 렌더링 시작');
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentSection, setCurrentSection] = useState('control');
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('대기 중');
  
  // 추가 상태들
  const [sourceLanguage, setSourceLanguage] = useState('ko-KR');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [originalText, setOriginalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState('');
  
  // 오버레이 표시 옵션
  const [showOriginalInOverlay, setShowOriginalInOverlay] = useState(false);
  
  // 현재 URL 가져오기
  const [currentOrigin, setCurrentOrigin] = useState('');
  
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
  
  // 단순한 동기화 함수
  const updateSubtitles = useCallback((originalText: string, translatedText: string, isListening: boolean, isTranslating: boolean) => {
    console.log('🔄 자막 업데이트:', { originalText, translatedText, isListening, isTranslating });
    
    // localStorage에 직접 저장 (가장 확실한 방법)
    try {
      const data = {
        originalText,
        translatedText,
        isListening,
        isTranslating,
        timestamp: Date.now(),
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
        status: isTranslating ? '번역 중' : '완료'
      };
      
      localStorage.setItem('subtitle_sync_data', JSON.stringify(data));
      console.log('✅ localStorage 업데이트 완료');
    } catch (error) {
      console.error('❌ localStorage 업데이트 실패:', error);
    }
  }, [sourceLanguage, targetLanguage]);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin);
    }
  }, []);
  

  useEffect(() => {
    console.log('🎯 Home 컴포넌트 마운트 완료');
    
    try {
      
      // 음성 인식 서비스 초기화
      webSpeechService.onResult((text: string) => {
        console.log('🎤 최종 음성 인식 결과:', text);
        setOriginalText(text);
        setStatus('번역 중...');
        setIsTranslating(true);
        
        // 자막 동기화
        updateSubtitles(text, '', isListening, true);
        
        // 자동 번역
        freeTranslationService.translate(text, targetLanguage, 'ko')
          .then((translated) => {
            console.log('🌍 번역 결과:', translated);
            setTranslatedText(translated);
            setIsTranslating(false);
            setStatus('번역 완료');
            
            // 번역 완료 동기화
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
  }, [targetLanguage, sourceLanguage, isListening]);


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
    console.log('🌙 다크모드 토글:', !isDarkMode);
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
      <SimpleHeader 
        isDarkMode={isDarkMode}
        setIsDarkMode={toggleDarkMode}
        isListening={isListening}
        toggleListening={toggleListening}
        status={status}
      />

      {/* 메인 레이아웃 - 고정 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 왼쪽 사이드바 - 고정 */}
        <SimpleSidebar
          isDarkMode={isDarkMode}
          currentSection={currentSection}
          setCurrentSection={setCurrentSection}
        />

        {/* 메인 콘텐츠 - 스크롤 가능 */}
        <main className="flex-1 overflow-y-auto">
          {/* 자막 미리보기 섹션 - 고정 */}
          <div className={`sticky top-0 z-10 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b px-4 py-3`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                🎬 자막 미리보기
              </h3>
              <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {isListening ? (
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
                  {translatedText ? (
                    <>
                      {translatedText}
                      {showOriginalInOverlay && originalText && originalText !== translatedText && (
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
                          {originalText}
                        </div>
                      )}
                    </>
                  ) : originalText ? (
                    originalText
                  ) : !isListening ? (
                    '안녕하세요! 음성인식을 시작해주세요 🎤'
                  ) : (
                    '음성을 듣고 있습니다...'
                  )}
                </div>
              </div>
            </div>
          </div>

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
                          value={currentOrigin ? `${currentOrigin}/overlay?source=${sourceLanguage}&target=${targetLanguage}&controls=false` : '로딩 중...'}
                          className={`flex-1 p-2 text-sm rounded-l-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-800'}`}
                        />
                        <button
                          onClick={() => copyToClipboard(
                            `${currentOrigin}/overlay?source=${sourceLanguage}&target=${targetLanguage}&controls=false`,
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
                          value={currentOrigin ? `${currentOrigin}/overlay?source=${sourceLanguage}&target=${targetLanguage}&controls=false&showOriginal=true` : '로딩 중...'}
                          className={`flex-1 p-2 text-sm rounded-l-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-800'}`}
                        />
                        <button
                          onClick={() => copyToClipboard(
                            `${currentOrigin}/overlay?source=${sourceLanguage}&target=${targetLanguage}&controls=false&showOriginal=true`,
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