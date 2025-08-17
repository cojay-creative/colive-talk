'use client';

import React, { useState, useEffect, useRef } from 'react';
import { webSpeechService } from '../../lib/speech';
import { freeTranslationService } from '../../lib/translate';

interface TranslationOverlayProps {
  targetLanguage: string;
  sourceLanguage: string;
  isVisible: boolean;
  onToggle: () => void;
  showOriginal?: boolean;
}

export default function TranslationOverlay({
  targetLanguage,
  sourceLanguage,
  isVisible,
  onToggle,
  showOriginal = false
}: TranslationOverlayProps) {
  const [isListening, setIsListening] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);
  const translationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 컴포넌트 마운트 시 상태 확인
  useEffect(() => {
    const speechStatus = webSpeechService.getStatus();
    if (!speechStatus.isSupported) {
      setError('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome, Edge, Safari를 사용해주세요.');
    }
  }, []);

  // 단순화된 번역 함수 (초창기 스타일)
  const translateText = async (text: string, isFinal: boolean = true) => {
    if (!text.trim()) return;
    
    // 최종 결과만 번역 (중간 결과는 표시만)
    if (!isFinal) {
      return;
    }
    
    try {
      setIsTranslating(true);
      setStatus('번역 중...');
      
      const translated = await freeTranslationService.translate(
        text, 
        targetLanguage, 
        sourceLanguage
      );
      
      setTranslatedText(translated);
      setError('');
      setStatus('번역 완료');
    } catch (err) {
      console.error('번역 오류:', err);
      setError('번역에 실패했습니다. 원본 텍스트를 표시합니다.');
      setTranslatedText(text);
      setStatus('번역 실패');
    } finally {
      setIsTranslating(false);
    }
  };

  // 음성 인식 결과 처리 (단순화)
  useEffect(() => {
    // 최종 결과 처리 (즉시 번역)
    webSpeechService.onResult(async (text) => {
      console.log('최종 음성 인식 결과:', text);
      setOriginalText(text);
      setInterimText(''); // 중간 텍스트 초기화
      await translateText(text, true); // 즉시 번역
    });
    
    // 중간 결과 처리 (표시만, 번역 안함)
    webSpeechService.onInterimResult((text) => {
      console.log('중간 음성 인식 결과:', text);
      setInterimText(text);
      setOriginalText(text); // 실시간 표시
      // 중간 결과는 번역하지 않음 (쾌적함 우선)
    });

    webSpeechService.onError((error) => {
      console.error('음성 인식 오류:', error);
      setError(`음성 인식 오류: ${error}`);
      setStatus('오류 발생');
    });
  }, [targetLanguage, sourceLanguage]);

  // 음성 인식 시작/중지
  const toggleListening = () => {
    if (isListening) {
      webSpeechService.stop();
      setIsListening(false);
      setStatus('음성 인식 중지됨');
    } else {
      const success = webSpeechService.start(sourceLanguage);
      if (success) {
        setIsListening(true);
        setError('');
        setStatus('음성 인식 시작됨 - 말씀해주세요');
      } else {
        setError('음성 인식을 시작할 수 없습니다. 마이크 권한을 확인해주세요.');
        setStatus('시작 실패');
      }
    }
  };

  // 언어 변경 시 음성 인식 재시작
  useEffect(() => {
    if (isListening) {
      webSpeechService.setLanguage(sourceLanguage);
      setStatus(`언어 변경됨: ${sourceLanguage}`);
    }
  }, [sourceLanguage, isListening]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (translationTimeoutRef.current) {
        clearTimeout(translationTimeoutRef.current);
      }
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed top-4 right-4 w-96 bg-black/90 text-white rounded-lg p-4 shadow-2xl border border-gray-600 z-50 backdrop-blur-sm"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-blue-300">🎬 실시간 자막</h3>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-white transition-colors text-xl"
        >
          ✕
        </button>
      </div>

      {/* 음성 인식 컨트롤 */}
      <div className="mb-4">
        <button
          onClick={toggleListening}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all text-lg ${
            isListening
              ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isListening ? '🎤 중지' : '🎤 시작'}
        </button>
      </div>

      {/* 원본 텍스트 (옵션에 따라 표시) */}
      {showOriginal && (originalText || interimText) && (
        <div className="mb-3">
          <div className={`p-3 rounded text-sm border-l-4 ${
            interimText && !originalText 
              ? 'bg-gray-700/50 border-gray-400 text-gray-300'
              : 'bg-gray-800 border-gray-500 text-white'
          }`}>
            {originalText || interimText}
          </div>
        </div>
      )}

      {/* 번역된 텍스트 (메인 표시) */}
      {(translatedText || isTranslating) && (
        <div className="mb-3">
          <div className={`p-4 rounded-lg text-base font-medium ${
            isTranslating 
              ? 'bg-blue-900/30 text-blue-200 border border-blue-500/30' 
              : 'bg-blue-900/50 text-white border-l-4 border-blue-500'
          }`}>
            {translatedText || '번역 중...'}
            {isTranslating && (
              <div className="ml-2 inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400"></div>
            )}
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded border border-red-500/30">
          ⚠️ {error}
        </div>
      )}

      {/* 간단한 상태 표시 */}
      {!translatedText && !isTranslating && !error && (
        <div className="text-xs text-gray-400 text-center p-3">
          {isListening ? '말씀하세요...' : '🎤 버튼을 클릭하여 시작'}
        </div>
      )}
    </div>
  );
}
