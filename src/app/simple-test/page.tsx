'use client';

import React, { useState, useEffect } from 'react';

export default function SimpleTestPage() {
  const [localStorageData, setLocalStorageData] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    const checkData = () => {
      try {
        const stored = localStorage.getItem('subtitle_sync_data');
        if (stored) {
          const data = JSON.parse(stored);
          setLocalStorageData(data);
          setLastUpdate(new Date().toLocaleTimeString());
        }
      } catch (error) {
        console.error('데이터 읽기 오류:', error);
      }
    };

    // 즉시 확인
    checkData();

    // 500ms마다 확인
    const interval = setInterval(checkData, 500);

    return () => clearInterval(interval);
  }, []);

  const testData = () => {
    const testSubtitle = {
      originalText: '테스트 원본 텍스트',
      translatedText: '테스트 번역된 텍스트',
      isListening: true,
      isTranslating: false,
      timestamp: Date.now(),
      sourceLanguage: 'ko',
      targetLanguage: 'en',
      status: '테스트'
    };

    localStorage.setItem('subtitle_sync_data', JSON.stringify(testSubtitle));
    console.log('테스트 데이터 저장:', testSubtitle);
  };

  const clearData = () => {
    localStorage.removeItem('subtitle_sync_data');
    setLocalStorageData(null);
    console.log('데이터 삭제됨');
  };

  const getDisplayText = () => {
    if (!localStorageData) return '안녕하세요! 음성인식을 시작해주세요 🎤';
    
    if (localStorageData.translatedText) {
      return localStorageData.translatedText;
    }
    
    if (localStorageData.originalText) {
      return localStorageData.originalText;
    }
    
    if (!localStorageData.isListening) {
      return '안녕하세요! 음성인식을 시작해주세요 🎤';
    }
    
    return '음성을 듣고 있습니다...';
  };

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>
        동기화 테스트 페이지
      </h1>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        {/* 자막 시뮬레이션 */}
        <div style={{
          background: 'rgba(0,0,0,0.8)',
          padding: '20px',
          borderRadius: '10px',
          border: '2px solid rgba(255,255,255,0.3)'
        }}>
          <h2 style={{ marginBottom: '20px' }}>자막 시뮬레이션 (OBS 스타일)</h2>
          <div style={{
            background: 'rgba(0,0,0,0.9)',
            color: '#ffffff',
            fontSize: '24px',
            padding: '16px 24px',
            borderRadius: '8px',
            textAlign: 'center',
            fontWeight: 'bold',
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
            border: '2px solid rgba(255,255,255,0.3)',
            lineHeight: '1.4',
            minHeight: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {getDisplayText()}
          </div>
        </div>

        {/* 컨트롤 */}
        <div style={{
          background: 'rgba(0,0,0,0.8)',
          padding: '20px',
          borderRadius: '10px',
          border: '2px solid rgba(255,255,255,0.3)'
        }}>
          <h2 style={{ marginBottom: '20px' }}>테스트 컨트롤</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={testData}
              style={{
                background: '#00ff88',
                color: 'black',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              테스트 데이터 생성
            </button>
            <button
              onClick={clearData}
              style={{
                background: '#ff4444',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              데이터 삭제
            </button>
          </div>
        </div>
      </div>

      {/* 데이터 상태 */}
      <div style={{
        background: 'rgba(0,0,0,0.8)',
        padding: '20px',
        borderRadius: '10px',
        border: '2px solid rgba(255,255,255,0.3)',
        marginTop: '20px',
        maxWidth: '1000px',
        margin: '20px auto 0'
      }}>
        <h2 style={{ marginBottom: '15px' }}>
          현재 데이터 상태 {lastUpdate && `(마지막 업데이트: ${lastUpdate})`}
        </h2>
        <pre style={{
          background: 'rgba(0,0,0,0.5)',
          padding: '15px',
          borderRadius: '5px',
          fontSize: '12px',
          fontFamily: 'monospace',
          color: '#00ff00',
          overflow: 'auto'
        }}>
          {localStorageData ? JSON.stringify(localStorageData, null, 2) : '데이터 없음'}
        </pre>
      </div>

      <div style={{
        marginTop: '20px',
        textAlign: 'center',
        background: 'rgba(255,255,255,0.1)',
        padding: '15px',
        borderRadius: '8px',
        maxWidth: '1000px',
        margin: '20px auto 0'
      }}>
        <p style={{ margin: 0, fontSize: '14px' }}>
          💡 이 페이지는 localStorage 동기화를 테스트합니다.<br/>
          메인 페이지에서 음성 인식을 시작하면 여기서 데이터가 실시간으로 업데이트되는 것을 확인할 수 있습니다.
        </p>
      </div>
    </div>
  );
}