'use client';

import React, { useState, useEffect } from 'react';

interface LayoutSettings {
  position: string;
  orientation: string;
  textAlign: string;
  fontSize: number;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  padding: number;
  margin: number;
  opacity: number;
  offsetX: number;
  offsetY: number;
}

interface SubtitleData {
  originalText: string;
  translatedText: string;
  isTranslating: boolean;
  isControllerActive: boolean;
  status: string;
  isListening: boolean;
  layoutSettings: LayoutSettings;
}

export default function SubtitlePage() {
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [originalText, setOriginalText] = useState('');
  // const [isControllerActive, setIsControllerActive] = useState(false); // 미래 사용 예정
  const [status, setStatus] = useState('대기 중');
  const [isListening, setIsListening] = useState(false);
  
  // 레이아웃 설정 상태
  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>({
    position: 'bottom',
    orientation: 'horizontal',
    textAlign: 'center',
    fontSize: 32,
    backgroundColor: 'rgba(0,0,0,0.8)',
    textColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    margin: 32,
    opacity: 1,
    offsetX: 0,
    offsetY: 0
  });

  // 설정 변경 감지를 위한 이전 설정 저장
  const [prevLayoutSettings, setPrevLayoutSettings] = useState<string>('');
  
  // 빠른 폴링을 위한 상태
  const [isFastPolling, setIsFastPolling] = useState(false);
  
  // 스마트 로딩 상태 (연속 번역 감지)
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const [isInContinuousMode, setIsInContinuousMode] = useState(false);

  // API 폴링으로 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/subtitle');
        if (response.ok) {
          const data: SubtitleData = await response.json();
          
          // 연속 번역 모드 감지
          const now = Date.now();
          const timeSinceLastUpdate = now - lastUpdateTime;
          const wasContinuous = timeSinceLastUpdate < 3000 && translatedText && data.translatedText && data.isTranslating;
          
          setIsInContinuousMode(Boolean(wasContinuous));
          
          // 기본 자막 데이터 업데이트
          setOriginalText(data.originalText || '');
          setTranslatedText(data.translatedText || '');
          
          // 연속 모드에서는 로딩 상태 숨김
          setIsTranslating(data.isTranslating && !wasContinuous);
          
          // setIsControllerActive(data.isControllerActive || false); // 미래 사용 예정
          setStatus(data.status || '대기 중');
          setIsListening(Boolean(data.isListening));
          
          if (data.translatedText) {
            setLastUpdateTime(now);
          }
          
          // 레이아웃 설정 업데이트 (변경 감지)
          if (data.layoutSettings) {
            const newSettingsString = JSON.stringify(data.layoutSettings);
            if (newSettingsString !== prevLayoutSettings) {
              console.log('🎨 레이아웃 설정 변경 감지:', data.layoutSettings);
              setLayoutSettings({
                ...layoutSettings,
                ...data.layoutSettings
              });
              setPrevLayoutSettings(newSettingsString);
              
              // 설정 변경 시 잠시 빠른 폴링 활성화
              setIsFastPolling(true);
              setTimeout(() => setIsFastPolling(false), 3000);
            }
          }
        }
      } catch (error) {
        console.warn('API 조회 실패:', error);
      }
    };

    // 즉시 실행
    fetchData();

    return () => {
      // 컴포넌트 언마운트 시 정리는 별도 useEffect에서 처리
    };
  }, []);

  // 동적 폴링 간격 관리
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/subtitle');
        if (response.ok) {
          const data: SubtitleData = await response.json();
          
          // 연속 번역 모드 감지
          const now = Date.now();
          const timeSinceLastUpdate = now - lastUpdateTime;
          const wasContinuous = timeSinceLastUpdate < 3000 && translatedText && data.translatedText && data.isTranslating;
          
          setIsInContinuousMode(Boolean(wasContinuous));
          
          setOriginalText(data.originalText || '');
          setTranslatedText(data.translatedText || '');
          setIsTranslating(data.isTranslating && !wasContinuous);
          // setIsControllerActive(data.isControllerActive || false); // 미래 사용 예정
          setStatus(data.status || '대기 중');
          setIsListening(Boolean(data.isListening));
          
          if (data.translatedText) {
            setLastUpdateTime(now);
          }
          
          // 레이아웃 설정 업데이트
          if (data.layoutSettings) {
            const newSettingsString = JSON.stringify(data.layoutSettings);
            if (newSettingsString !== prevLayoutSettings) {
              setLayoutSettings({
                ...layoutSettings,
                ...data.layoutSettings
              });
              setPrevLayoutSettings(newSettingsString);
              setIsFastPolling(true);
              setTimeout(() => setIsFastPolling(false), 3000);
            }
          }
        }
      } catch (error) {
        console.warn('API 조회 실패:', error);
      }
    };

    // 즉시 실행
    fetchData();

    // 동적 폴링 간격 (빠른 모드: 200ms, 일반 모드: 500ms)
    const interval = setInterval(fetchData, isFastPolling ? 200 : 500);

    return () => clearInterval(interval);
  }, [isFastPolling, prevLayoutSettings, layoutSettings, lastUpdateTime, translatedText]);

  // Hex 색상을 RGBA로 변환
  const hexToRgba = (hex: string, alpha: number) => {
    if (hex.includes('rgba')) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // 자막 스타일 생성
  const getSubtitleStyle = () => {
    const rgbaBackground = layoutSettings.backgroundColor.startsWith('#') 
      ? hexToRgba(layoutSettings.backgroundColor, layoutSettings.opacity)
      : layoutSettings.backgroundColor;

    return {
      backgroundColor: rgbaBackground,
      color: layoutSettings.textColor,
      fontSize: `${layoutSettings.fontSize}px`,
      padding: `${layoutSettings.padding}px`,
      borderRadius: `${layoutSettings.borderRadius}px`,
      textAlign: layoutSettings.textAlign as 'left' | 'center' | 'right',
      textShadow: '3px 3px 6px rgba(0,0,0,0.9), -2px -2px 4px rgba(0,0,0,0.9)',
      border: '2px solid rgba(255,255,255,0.3)',
      fontWeight: 'bold',
      lineHeight: '1.4',
      display: 'inline-block',
      maxWidth: '90vw',
      wordWrap: 'break-word' as 'break-word',
      transform: `translate(${layoutSettings.offsetX}px, ${layoutSettings.offsetY}px)`
    };
  };

  return (
    <div 
      className="min-h-screen w-full overflow-hidden"
      style={{ backgroundColor: 'transparent' }}
    >
      {/* 자막 표시 영역 */}
      <div className={`fixed inset-0 flex ${
        layoutSettings.orientation === 'vertical' ? 'aspect-[9/16]' : ''
      } ${
        layoutSettings.position === 'top' ? 'items-start justify-center pt-16' :
        layoutSettings.position === 'center' ? 'items-center justify-center' : 
        'items-end justify-center pb-16'
      } ${
        layoutSettings.textAlign === 'left' ? 'justify-start pl-16' :
        layoutSettings.textAlign === 'right' ? 'justify-end pr-16' : 
        'justify-center'
      }`}>
        
        {/* 번역된 텍스트 표시 */}
        {translatedText && !isTranslating && !isInContinuousMode && (
          <div style={getSubtitleStyle()}>
            {translatedText}
          </div>
        )}

        {/* 연속 모드: 기존 자막에 점만 추가 */}
        {isInContinuousMode && translatedText && (
          <div style={{...getSubtitleStyle(), position: 'relative'}}>
            {translatedText}
            <span 
              className="absolute animate-pulse opacity-50"
              style={{ 
                right: '-16px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: `${layoutSettings.fontSize * 0.8}px`
              }}
            >...</span>
          </div>
        )}

        {/* 첫 번째 번역만 미니멀 로딩 */}
        {isTranslating && !isInContinuousMode && originalText && (
          <div 
            style={{
              ...getSubtitleStyle(),
              backgroundColor: 'transparent',
              border: 'none',
              padding: `${layoutSettings.padding / 2}px`
            }}
          >
            <div className="flex items-center justify-center">
              <span 
                className="animate-pulse opacity-70"
                style={{ fontSize: `${layoutSettings.fontSize * 0.6}px` }}
              >...</span>
            </div>
          </div>
        )}

        {/* 대기 상태 (개발용 - 프로덕션에서는 숨김) */}
        {!translatedText && !isTranslating && !isInContinuousMode && process.env.NODE_ENV === 'development' && (
          <div 
            style={{
              ...getSubtitleStyle(),
              backgroundColor: 'rgba(75, 85, 99, 0.5)',
              color: '#d1d5db',
              fontSize: `${Math.max(layoutSettings.fontSize * 0.7, 16)}px`
            }}
          >
            🎤 음성 인식을 시작하세요
          </div>
        )}
      </div>

      {/* 상태 표시 (우상단, 작게) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-white border border-gray-600">
          <div className={`font-medium ${isListening ? 'text-green-300' : 'text-red-300'}`}>
            {isListening ? '🟢 인식 중' : '🔴 대기'}
          </div>
          <div className="text-gray-400 text-xs mt-1">
            {status} {isInContinuousMode && '(연속모드)'}
          </div>
        </div>
      )}
    </div>
  );
}