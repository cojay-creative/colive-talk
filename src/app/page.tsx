'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
// import { webSpeechService } from '../lib/speech'; 
// import { whisperSpeechService as webSpeechService } from '../lib/whisper-speech'; // 🤖 Whisper 모델 단독 테스트
// import { hybridSpeechService as webSpeechService } from '../lib/hybrid-speech'; // 🤖 Whisper AI 우선, Web Speech 폴백
import { freeTranslationService } from '../lib/translate';
import { syncService } from '../lib/sync';

export default function Home() {
  console.log('🏠 Home 컴포넌트 렌더링 시작');
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
  
  // 중간 결과 처리를 위한 상태 (미래 사용 예정)
  // const [interimText, setInterimText] = useState('');
  // const [interimTranslation, setInterimTranslation] = useState('');
  const [translationTimer, setTranslationTimer] = useState<NodeJS.Timeout | null>(null);
  
  // 오버레이 표시 옵션
  const [showOriginalInOverlay, setShowOriginalInOverlay] = useState(false);
  
  // 현재 URL 가져오기
  const [currentOrigin, setCurrentOrigin] = useState('');
  
  // 사용자별 고유 세션 ID
  const [sessionId, setSessionId] = useState('');
  
  // 동적으로 로드할 음성 서비스
  const [webSpeechService, setWebSpeechService] = useState<any>(null);
  const [serviceLoadError, setServiceLoadError] = useState<string>('');
  
  // 실시간 번역 설정 (초고속 반응형)
  const [realtimeSettings, setRealtimeSettings] = useState({
    enableInterimTranslation: true,    // 중간 결과 번역 활성화
    interimThreshold: 4,                // 중간 번역 시작 글자 수 (Whisper 활성화로 4글자로 최적화)
    autoSegmentLength: 50,              // 자동 분할 길이 (글자 수)
    translationDelay: 200,              // 번역 지연 시간 (Whisper 활성화로 200ms로 단축)
    autoDissolveTime: 5,                // 자동 디졸브 시간 (초)
    enableAutoDissolve: true,           // 자동 디졸브 활성화
    wordByWordMode: true,               // 단어별 실시간 번역 모드
    instantTranslation: true,           // 즉석 번역 모드
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
  
  // 자동 디졸브 타이머 관리 (개선된 로직)
  const resetDissolveTimer = useCallback((hasText: boolean = false, listening: boolean = false) => {
    // 기존 타이머 클리어
    if (dissolveTimer) {
      clearTimeout(dissolveTimer);
      setDissolveTimer(null);
      console.log('🧹 기존 디졸브 타이머 클리어');
    }

    // 음성인식이 중지되면 즉시 디졸브 (타이머 없이)
    if (!listening) {
      console.log('🛑 음성인식 중지됨 - 즉시 디졸브');
      setSyncedOriginalText('');
      setSyncedTranslatedText('');
      setOriginalText('');
      setTranslatedText('');
      return;
    }

    // 자동 디졸브 조건: 음성인식 중이고, 텍스트가 있고, 디졸브 기능이 활성화된 경우에만
    if (realtimeSettings.enableAutoDissolve && 
        realtimeSettings.autoDissolveTime > 0 && 
        listening && 
        hasText) {
      
      console.log(`⏰ ${realtimeSettings.autoDissolveTime}초 후 디졸브 예약`);
      
      const timer = setTimeout(() => {
        // 타이머 실행 시점에 다시 조건 확인 (상태가 변했을 수 있음)
        if (isListening && realtimeSettings.enableAutoDissolve) {
          console.log(`⏰ ${realtimeSettings.autoDissolveTime}초 경과 - 자동 디졸브 실행`);
          
          // 모든 텍스트 상태 클리어
          setSyncedOriginalText('');
          setSyncedTranslatedText('');
          setOriginalText('');
          setTranslatedText('');
          
          // API도 빈 텍스트로 업데이트 (음성인식은 유지)
          updateSubtitles('', '', true, false);
        }
      }, realtimeSettings.autoDissolveTime * 1000);

      setDissolveTimer(timer);
    }
  }, [dissolveTimer, realtimeSettings.enableAutoDissolve, realtimeSettings.autoDissolveTime, sessionId]);

  // 중복 전송 방지를 위한 상태
  const [lastSentData, setLastSentData] = useState({ originalText: '', translatedText: '', isListening: false, timestamp: 0 });
  
  // 비동기 작업 순차 처리를 위한 상태
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingQueue, setProcessingQueue] = useState<Array<{type: string, data: any}>>([]);
  
  // API 기반 동기화 함수 (빈 값 전송 방지)
  const updateSubtitles = useCallback(async (originalText: string, translatedText: string, isListening: boolean, isTranslating: boolean) => {
    // 빈 값만 전송하는 경우 방지 (음성인식 중에만 예외)
    if (!isListening && !originalText && !translatedText) {
      console.log('🚫 빈 값 전송 방지 - 음성인식 비활성 상태에서 빈 데이터');
      return;
    }
    
    // 데이터 해시 생성 (중복 전송 방지)
    const dataHash = `${originalText}_${translatedText}_${isListening}`;
    const lastHash = `${lastSentData.originalText}_${lastSentData.translatedText}_${lastSentData.isListening}`;
    
    // 동일한 데이터이고 지난 전송 후 2초가 지나지 않았으면 건너뛰기 (Edge Requests 절약)
    if (dataHash === lastHash && (Date.now() - lastSentData.timestamp) < 2000) {
      console.log('🚫 중복 전송 방지 (Edge Requests 절약):', dataHash);
      return;
    }
    
    console.log('🔄 자막 업데이트:', { originalText, translatedText, isListening, isTranslating });
    
    // 마지막 전송 데이터 업데이트
    setLastSentData({ originalText, translatedText, isListening, timestamp: Date.now() });
    
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
      // 음성인식이 활성화된 상태에서는 항상 디졸브 타이머 시작 (텍스트 존재 여부와 관계없이)
      const hasText = !!(originalText || translatedText);
      console.log(`🔄 음성인식 활성 상태 - 디졸브 타이머 시작 (텍스트 존재: ${hasText})`);
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
    
    // 🚀 1. OBS 오버레이 우선순위: API 서버에 데이터 전송 (가장 먼저 실행)
    const sendToAPI = async () => {
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
          console.log('🎯 OBS 우선순위 - API 전송 성공:', result);
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

    // 🎯 OBS 오버레이에 최우선으로 전송 (Edge Requests 절약을 위해 재시도 제한)
    let success = await sendToAPI();
    // 재시도는 중요한 최종 번역 결과에만 제한 (중간 결과는 재시도하지 않음)
    if (!success && updateData.translatedText && !isTranslating) { 
      console.log('🔄 중요한 최종 번역만 재시도 (Edge Requests 절약)');
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms로 증가 (서버 부하 감소)
      success = await sendToAPI();
      
      if (!success) {
        console.warn('⚠️ API 전송 실패 - PostMessage로 대체 전송');
      }
    }

    // 🚀 3. PostMessage 우선순위 전송 (OBS 오버레이 iframe 먼저)
    try {
      const postMessageData = {
        type: 'SUBTITLE_UPDATE',
        ...updateData,
        timestamp: Date.now(),
        dataHash, // 중복 감지를 위한 해시 추가
        priority: 'OBS_OVERLAY' // 우선순위 표시
      };
      
      // 🎯 1순위: iframe에 먼저 전송 (OBS 오버레이 타겟)
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          iframe.contentWindow?.postMessage(postMessageData, '*');
        } catch (e) {
          // Cross-origin 제한으로 인한 에러는 무시
        }
      });
      
      // 🎯 2순위: 부모 창에 전송 (OBS가 부모 창에서 iframe으로 로드한 경우)
      if (window.parent !== window) {
        try {
          window.parent.postMessage(postMessageData, '*');
        } catch (e) {
          // Cross-origin 제한으로 인한 에러는 무시
        }
      }
      
      // 3순위: 현재 창에 브로드캐스트 (브라우저 미리보기)
      window.postMessage(postMessageData, '*');
      
      console.log('🎯 OBS 우선순위 - PostMessage 브로드캐스트 완료');
    } catch (error) {
      console.error('❌ PostMessage 전송 실패:', error);
    }

    // 🐌 마지막: localStorage 동기화 (브라우저 미리보기용 - 가장 마지막에 실행)
    try {
      syncService.updateData(updateData);
      console.log('✅ 브라우저 미리보기 - syncService 업데이트 완료 (최후순위)');
    } catch (error) {
      console.error('❌ syncService 업데이트 실패:', error);
    }
  }, [sourceLanguage, targetLanguage, sessionId, dissolveTimer, resetDissolveTimer]);

  // 실시간 번역 함수 (Edge Requests 절약을 위해 최적화)
  const handleInterimTranslation = useCallback(async (text: string) => {
    if (!realtimeSettings.enableInterimTranslation) return;
    if (text.length < realtimeSettings.interimThreshold) return;

    // Edge Requests 절약하면서도 빠른 반응: Whisper 활성화로 중간 번역 효율적 (6글자로 절충)
    if (text.length < 6) return;

    console.log('⚡ 실시간 번역 시작 (Edge Requests 절약):', text);

    // 기존 타이머 클리어
    if (translationTimer) {
      clearTimeout(translationTimer);
      setTranslationTimer(null);
    }

    try {
      // 즉시 번역 (타이머 없이 동기 처리)
      console.log('🚀 즉시 번역 시작:', text);
      
      // 번역 품질 향상: 한 번에 완전한 번역만 수행
      const translated = await freeTranslationService.translate(text, targetLanguage, 'ko');
      console.log('🌍 실시간 번역 완료:', translated);
      
      // 번역이 원본과 다르고, 완전한 번역인 경우만 표시
      if (translated && 
          translated.trim() && 
          translated !== text && 
          !translated.includes('undefined') && 
          !translated.includes('null')) {
        
        const displayText = realtimeSettings.instantTranslation ? `${translated} ⚡` : translated;
        console.log('📡 실시간 번역 결과 전송:', displayText);
        updateSubtitles(text, displayText, isListening, false);
      } else {
        // 번역이 실패하거나 부정확한 경우 전솥 안함 (깜빡임 방지)
        console.log('⚠️ 번역 품질 문제로 전송 건너뛰기:', translated);
      }
      
    } catch (error) {
      console.error('❌ 실시간 번역 실패:', error);
      // 번역 실패 시 전송 안함 (깜빡임 방지)
    }
  }, [targetLanguage, realtimeSettings.enableInterimTranslation, realtimeSettings.interimThreshold, realtimeSettings.instantTranslation, translationTimer, isListening, updateSubtitles]);

  // 긴 문장 자동 분할 처리 - 동기화 개선
  const handleAutoSegmentation = useCallback(async (text: string) => {
    if (text.length <= realtimeSettings.autoSegmentLength) return;
    
    // 마지막 완성된 문장까지 찾기
    const sentences = text.split(/[.!?。！？]/);
    if (sentences.length <= 1) return;
    
    const completeSentence = sentences.slice(0, -1).join('.') + '.';
    console.log('🔪 문장 자동 분할:', completeSentence);
    
    // 완성된 부분만 번역
    try {
      setIsTranslating(true);
      const translated = await freeTranslationService.translate(completeSentence, targetLanguage, 'ko');
      
      // 번역 품질 검증
      if (translated && 
          translated.trim() && 
          translated !== completeSentence && 
          !translated.includes('undefined') && 
          !translated.includes('null')) {
        
        // OBS 우선순위 - API 먼저 전송하고 완료 대기
        console.log('📡 OBS 우선순위 - 자동 분할 번역 결과 전송:', { completeSentence, translated });
        
        updateSubtitles(completeSentence, translated, isListening, false).then(() => {
          console.log('✅ OBS 자동분할 전송 완료 - 브라우저 UI 업데이트');
          
          // OBS 전송 완료 후 브라우저 UI 업데이트
          setTimeout(() => {
            setOriginalText(completeSentence);
            setTranslatedText(translated);
            console.log('🖥️ 브라우저 자동분할 UI 업데이트 완료 (OBS 전송 후)');
          }, 80); // 80ms 지연으로 확실히 구분
        }).catch((error) => {
          console.error('❌ OBS 자동분할 전송 실패:', error);
          setOriginalText(completeSentence);
          setTranslatedText(translated);
        });
      } else {
        // 번역 품질 문제시 전송 안함 (깜빡임 방지)
        console.log('⚠️ 자동 분할 번역 품질 문제로 전송 건너뛰기');
      }
      
    } catch (error) {
      console.error('❌ 자동 분할 번역 실패:', error);
    } finally {
      setIsTranslating(false);
    }
  }, [targetLanguage, realtimeSettings.autoSegmentLength, isListening, updateSubtitles]);
  
  useEffect(() => {
    console.log('🔄 useEffect 실행됨 - 초기화 시작');
    if (typeof window !== 'undefined') {
      console.log('🔄 브라우저 환경 확인됨');
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
      
      // 단순한 Whisper 서비스 테스트
      console.log('🔄 Whisper 서비스 로딩 테스트 시작...');
      
      setTimeout(async () => {
        console.log('🔄 타이머 실행됨 - 동적 import 시도');
        
        try {
          console.log('📦 whisper-speech 모듈 import 중...');
          const whisperModule = await import('../lib/whisper-speech');
          console.log('✅ whisper-speech 모듈 import 성공:', Object.keys(whisperModule));
          
          if (whisperModule.whisperSpeechService) {
            setWebSpeechService(whisperModule.whisperSpeechService);
            console.log('✅ whisperSpeechService 설정 완료');
          } else {
            console.error('❌ whisperSpeechService가 모듈에 없음');
            setServiceLoadError('whisperSpeechService를 찾을 수 없음');
          }
        } catch (importError) {
          console.error('❌ whisper-speech 모듈 import 실패:', importError);
          const errorMessage = importError instanceof Error ? importError.message : String(importError);
          const errorStack = importError instanceof Error ? importError.stack : undefined;
          console.error('오류 상세:', errorMessage, errorStack);
          setServiceLoadError(`Whisper 모듈 import 실패: ${errorMessage}`);
        }
      }, 1000);
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
        
        // 브라우저 UI 업데이트를 약간 지연 (OBS 우선순위 보장)
        setTimeout(() => {
          setOriginalText(text);
          setStatus('번역 중...');
          setIsTranslating(true);
          console.log('🖥️ 브라우저 원본 텍스트 표시 (OBS 후순위)');
        }, 30); // 30ms 지연
        
        // 중간 번역 타이머 및 처리 중단
        if (translationTimer) {
          clearTimeout(translationTimer);
          setTranslationTimer(null);
        }
        
        // 처리 중이면 중단
        setIsProcessing(false);
        setProcessingQueue([]); // 대기열 비우기
        
        console.log('🏁 최종 음성 인식 결과 - 모든 중간 처리 중단');
        
        // 자동 번역
        freeTranslationService.translate(text, targetLanguage, 'ko')
          .then((translated) => {
            console.log('🌍 번역 결과:', translated);
            
            // 번역 품질 검증 (최종 결과)
            if (translated && 
                translated.trim() && 
                translated !== text && 
                !translated.includes('undefined') && 
                !translated.includes('null')) {
              
              // ✅ 최종 번역 결과를 OBS에 먼저 전송 (최고 우선순위)
              console.log('🏆 OBS 우선순위 - 최종 번역 결과 전송:', { text, translated });
              
              // OBS API 호출 완료 대기 후 브라우저 UI 업데이트
              updateSubtitles(text, translated, isListening, false).then(() => {
                console.log('✅ OBS API 전송 완료 - 이제 브라우저 UI 업데이트');
                
                // OBS 전송이 완료된 후 브라우저 UI 업데이트
                setTimeout(() => {
                  setTranslatedText(translated);
                  setIsTranslating(false);
                  setStatus('번역 완료');
                  console.log('🖥️ 브라우저 UI 업데이트 완료 (OBS 전송 후)');
                }, 100); // 추가 100ms 지연으로 확실히 구분
              }).catch((error) => {
                console.error('❌ OBS 전송 실패, 브라우저만 업데이트:', error);
                setTranslatedText(translated);
                setIsTranslating(false);
                setStatus('번역 완료 (OBS 연결 실패)');
              });
            } else {
              // 번역 품질 문제시 원본만 표시
              console.log('⚠️ 최종 번역 품질 문제로 원본만 표시:', translated);
              setTranslatedText('');
              setIsTranslating(false);
              setStatus('번역 품질 문제');
              updateSubtitles(text, '', isListening, true);
            }
          })
          .catch((error) => {
            console.error('❌ 번역 오류 (음성인식은 유지):', error);
            
            // 번역 실패해도 원본 텍스트는 표시하고 음성인식은 계속 유지
            console.log('📝 번역 실패 - 원본 텍스트만 표시하고 음성인식 계속');
            
            // OBS에 원본 텍스트라도 전송 (번역 실패를 알리는 표시 추가)
            updateSubtitles(text, `[번역실패] ${text}`, isListening, false).then(() => {
              // 브라우저 UI는 지연 업데이트
              setTimeout(() => {
                setTranslatedText(''); // 번역 텍스트는 비우기
                setIsTranslating(false);
                setStatus('번역 실패 - 음성인식 계속');
                setError('번역 서비스 연결 문제 (음성인식은 계속 진행)');
                console.log('🖥️ 번역실패 브라우저 UI 업데이트 완료');
              }, 100);
            }).catch(() => {
              // API 전송도 실패한 경우에만 브라우저만 업데이트
              setTranslatedText('');
              setIsTranslating(false);
              setStatus('번역 및 API 실패');
              setError('서비스 연결 문제');
            });
          });
      });

      // 중간 결과 처리 (실시간 번역) - 순차 처리
      webSpeechService.onInterimResult(async (text: string) => {
        console.log('🔄 중간 음성 인식 결과:', text);
        
        // 이미 처리 중이면 대기열에 추가
        if (isProcessing) {
          console.log('🔄 이미 처리 중 - 대기열에 추가');
          setProcessingQueue(prev => [...prev.slice(-2), {type: 'interim', data: text}]); // 최대 3개만 유지
          return;
        }
        
        setIsProcessing(true);
        
        try {
          // 자동 분할 처리 (우선순위)
          if (text.length > realtimeSettings.autoSegmentLength) {
            await handleAutoSegmentation(text);
          } else {
            // 중간 번역 처리
            await handleInterimTranslation(text);
          }
        } catch (error) {
          console.error('😨 중간 처리 오류:', error);
        } finally {
          setIsProcessing(false);
          
          // 대기열에 작업이 있으면 처리
          setProcessingQueue(prev => {
            if (prev.length > 0) {
              const next = prev[prev.length - 1]; // 가장 최신 작업만 처리
              console.log('🔄 대기열에서 작업 처리:', next.data);
              
              setTimeout(async () => {
                setIsProcessing(true);
                try {
                  if (next.data.length > realtimeSettings.autoSegmentLength) {
                    await handleAutoSegmentation(next.data);
                  } else {
                    await handleInterimTranslation(next.data);
                  }
                } finally {
                  setIsProcessing(false);
                }
              }, 100);
              
              return []; // 대기열 비우기
            }
            return prev;
          });
        }
      });

      webSpeechService.onError((error: string) => {
        console.error('🚨 음성 인식 오류:', error);
        
        // 복구 가능한 오류 - 네트워크 오류 등 자동 복구 가능한 경우
        const recoverableErrors = ['network', 'audio-capture', 'aborted', 'no-speech', 'service-not-allowed'];
        const isRecoverable = recoverableErrors.some(recoverable => error.includes(recoverable));
        
        if (isRecoverable) {
          console.log('🔄 복구 가능한 오류 - UI 상태 유지하며 자동 복구 대기:', error);
          
          // UI 상태는 "listening" 유지 - 사용자가 중지한 게 아니므로
          // setIsListening(false); // 이 줄을 제거 - 상태 유지
          
          setError(`네트워크 문제로 재연결 중입니다... (${error})`);
          setStatus('🔄 재연결 시도 중...');
          
          // 연결 상태를 사용자에게 알리지만 음성인식은 계속 시도 중임을 표시
          console.log('💡 음성인식 상태 유지 - 자동 재시작 대기 중');
          
          // 5초 후 재연결 상태 메시지 자동 제거 (더 오래 표시)
          setTimeout(() => {
            // 여전히 같은 오류 상태면 메시지 제거하고 정상 상태로
            if (error.includes('network') && isListening) {
              setError('');
              setStatus('🎤 음성 인식 활성');
            }
          }, 5000);
          
        } else {
          // 복구 불가능한 오류 - 사용자 개입 필요 (마이크 권한 거부 등)
          console.error('❌ 복구 불가능한 오류 - 사용자 개입 필요:', error);
          setError(`음성 인식 오류: ${error}`);
          setStatus('⚠️ 오류 발생 - 다시 시작해주세요');
          setIsListening(false); // 이런 오류만 완전히 중지
          
          // 동기화 서비스에 중지 상태 전송
          updateSubtitles('', '', false, false);
        }
        
        console.log('😨 오류 발생 - 상태:', { error, isRecoverable, isListening });
      });

      webSpeechService.onStatus((status: string) => {
        console.log('📊 음성 인식 상태:', status);
        setStatus(status);
        
        // 상태 업데이트는 updateSubtitles로 통합 처리 (중복 방지)
        // updateSubtitles로 대체됨
      });
    } catch (error) {
      console.error('초기화 오류:', error);
      setError('서비스 초기화에 실패했습니다.');
      setStatus('초기화 실패');
    }

    const timer = setTimeout(() => {
      setStatus('준비 완료');
      console.log('✅ 상태 업데이트 성공');
      
      // 초기 상태는 전송하지 않음 (빈 값 전송 방지)
      console.log('🔄 초기 상태 - 전송 건너뛰기');
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
  }, [targetLanguage, sourceLanguage, isListening, translationTimer]);

  // localStorage 실시간 동기화 (미리보기용)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const STORAGE_KEY = 'subtitle_sync_data';
    
    const loadSyncData = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          // 빈 데이터를 수신한 경우 믴시 (상태 업데이트 방지)
          if (!data.originalText && !data.translatedText && !data.isListening) {
            console.log('🚫 미리보기: 빈 데이터 무시');
            return;
          }
          
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

    // Edge Requests 절약을 위해 폴링 간격 대폭 증가
    const interval = setInterval(loadSyncData, 1000); // 300ms → 1000ms로 변경 (Edge Requests 절약)

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);


  const toggleListening = useCallback(async () => {
    console.log('🎤 음성 인식 토글:', !isListening);
    
    if (!isListening) {
      // 서비스 로딩 확인
      if (!webSpeechService) {
        setError('음성 서비스가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
        if (serviceLoadError) {
          setError(serviceLoadError);
        }
        return;
      }
      
      // 음성 인식 시작
      setError('');
      setOriginalText('');
      setTranslatedText('');
      setStatus('🤖 Whisper AI 모델 준비 중...');
      
      try {
        console.log('🚀 Whisper 서비스 직접 시작 시도');
        console.log('🔍 webSpeechService 객체 확인:', {
          service: typeof webSpeechService,
          hasStart: typeof webSpeechService?.start,
          hasInitialize: typeof webSpeechService?.initialize,
          isModelReady: webSpeechService?.isModelReady?.()
        });
        
        const success = await webSpeechService.start(sourceLanguage);
        if (success) {
          setIsListening(true);
          setStatus('🎤 Whisper AI 음성 인식 활성');
          
          // 음성 인식 시작 동기화
          updateSubtitles('', '', true, false);
        } else {
          setError('Whisper AI 모델 로딩 실패. 네트워크 상태를 확인해주세요.');
          setStatus('Whisper AI 시작 실패');
          
          // 동기화 서비스에 오류 상태 업데이트
          syncService.updateData({
            isListening: false,
            status: 'Whisper AI 시작 실패',
            error: 'Whisper AI 모델 로딩 실패. 네트워크 상태를 확인해주세요.',
            sourceLanguage: sourceLanguage,
            targetLanguage: targetLanguage
          });
        }
      } catch (error) {
        console.error('❌ Whisper 시작 중 오류:', error);
        setError(`Whisper AI 오류: ${error}`);
        setStatus('Whisper AI 오류 발생');
        
        syncService.updateData({
          isListening: false,
          status: 'Whisper AI 오류 발생',
          error: `Whisper AI 오류: ${error}`,
          sourceLanguage: sourceLanguage,
          targetLanguage: targetLanguage
        });
      }
    } else {
      // 사용자가 명시적으로 중지 버튼을 눌렀을 때만 완전히 중지
      console.log('📋 사용자가 음성 인식 중지 버튼 클릭 - 완전 중지');
      
      // 모든 자동 재시작 기능 비활성화
      webSpeechService.stop();
      
      // UI 상태 업데이트
      setIsListening(false);
      setStatus('음성 인식 중지됨');
      setError(''); // 오류 메시지 제거
      
      // 모든 처리 중단
      setIsProcessing(false);
      setProcessingQueue([]);
      
      if (translationTimer) {
        clearTimeout(translationTimer);
        setTranslationTimer(null);
      }
      
      // 음성 인식 중지 동기화
      updateSubtitles(originalText, translatedText, false, false);
    }
  }, [isListening, sourceLanguage, targetLanguage, originalText, translatedText]);

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
                <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>🤖 Whisper AI 음성인식</h3>
                <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-400">
                  <p className="text-sm text-purple-700">
                    <strong>✨ AI 우선 모드</strong> - OpenAI Whisper AI 모델 (로컬 처리)
                    {!isListening && (
                      <span className="block mt-1 text-purple-600">
                        🌍 99개 언어 지원 | 🎯 최고 품질 인식 | 🔒 개인정보 보호 (로컬 처리)
                        <br />
                        <span className="text-xs text-purple-500">※ AI 로딩 실패 시 브라우저 기본 음성인식으로 자동 전환</span>
                      </span>
                    )}
                  </p>
                </div>
                
                <div className="flex space-x-4">
                  <button
                    onClick={toggleListening}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      isListening
                        ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-md'
                        : 'bg-[#00B1A9] hover:bg-[#008F87] text-white shadow-md hover:shadow-lg'
                    }`}
                  >
{isListening ? '⏹️ Whisper AI 중지' : '🚀 Whisper AI 시작'}
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
                
                <div className={`mt-4 p-4 rounded-lg border ${
                  status.includes('재연결') 
                    ? 'bg-yellow-50 border-yellow-200' 
                    : 'bg-[#00B1A9]/5 border-[#00B1A9]/20'
                }`}>
                  <div className={`text-sm ${
                    status.includes('재연결') 
                      ? 'text-yellow-700' 
                      : 'text-[#00B1A9]'
                  }`}>
                    💡 <strong>현재 상태:</strong> {status}
                  </div>
                  {status.includes('재연결') && (
                    <div className="text-xs text-yellow-600 mt-1">
                      🔄 음성인식은 계속 활성 상태입니다. 네트워크가 복구되면 자동으로 재개됩니다.
                    </div>
                  )}
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
                  <div className={`p-4 rounded-lg border ${
                    status.includes('재연결') 
                      ? 'bg-yellow-50 border-yellow-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="text-sm mb-2">음성 인식:</div>
                    <div className={`text-lg font-medium ${
                      isListening 
                        ? (status.includes('재연결') ? 'text-yellow-500' : 'text-green-500')
                        : 'text-red-500'
                    }`}>
                      {isListening 
                        ? (status.includes('재연결') ? '🟡 재연결 중' : '🟢 활성')
                        : '🔴 비활성'
                      }
                    </div>
                    {status.includes('재연결') && isListening && (
                      <div className="text-xs text-yellow-600 mt-1">
                        네트워크 문제로 재연결 시도 중
                      </div>
                    )}
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
                        const newSourceLanguage = e.target.value;
                        setSourceLanguage(newSourceLanguage);
                        
                        // 음성인식이 활성화된 상태라면 언어만 변경하고 인식은 계속 유지
                        if (isListening) {
                          console.log('🎯 음성인식 중 언어 변경:', newSourceLanguage);
                          webSpeechService.setLanguage(newSourceLanguage);
                          setStatus(`언어 변경됨 (${newSourceLanguage}) - 음성인식 계속`);
                        }
                        
                        // 동기화 서비스에 언어 설정 업데이트
                        syncService.updateData({
                          sourceLanguage: newSourceLanguage,
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