'use client';

import React, { useEffect, useState } from 'react';

export default function TestIframePage() {
  const [overlayUrl, setOverlayUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOverlayUrl(`${window.location.origin}/overlay`);
    }
  }, []);

  const sendTestMessage = () => {
    const testData = {
      type: 'SUBTITLE_UPDATE',
      originalText: '테스트 원본 텍스트',
      translatedText: '테스트 번역된 텍스트',
      isListening: true,
      isTranslating: false,
      timestamp: Date.now()
    };

    // iframe에 메시지 전송 테스트
    const iframe = document.getElementById('overlay-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(testData, '*');
      console.log('📡 iframe에 테스트 메시지 전송:', testData);
    }

    // 현재 윈도우에도 전송
    window.postMessage(testData, '*');
  };

  if (!overlayUrl) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>
        iframe PostMessage 테스트 (OBS 브라우저 소스 시뮬레이션)
      </h1>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.8)',
          padding: '20px',
          borderRadius: '10px'
        }}>
          <h2>컨트롤 패널</h2>
          <button
            onClick={sendTestMessage}
            style={{
              background: '#00ff88',
              color: 'black',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginBottom: '10px',
              width: '100%'
            }}
          >
            테스트 메시지 전송
          </button>
          <p style={{ fontSize: '14px', opacity: 0.8 }}>
            이 버튼은 iframe(오버레이)에 PostMessage를 전송합니다.<br/>
            OBS 브라우저 소스와 동일한 방식으로 작동합니다.
          </p>
        </div>

        <div style={{
          background: 'rgba(0,0,0,0.8)',
          padding: '20px',
          borderRadius: '10px'
        }}>
          <h2>설명</h2>
          <ul style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <li>왼쪽의 iframe은 실제 오버레이 페이지입니다</li>
            <li>이는 OBS 브라우저 소스가 로드하는 것과 동일합니다</li>
            <li>"테스트 메시지 전송" 버튼으로 PostMessage를 테스트할 수 있습니다</li>
            <li>브라우저 개발자 도구 콘솔에서 메시지 로그를 확인하세요</li>
          </ul>
        </div>
      </div>

      <div style={{
        background: 'rgba(0,0,0,0.8)',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px'
      }}>
        <h2>오버레이 iframe (OBS 브라우저 소스 시뮬레이션)</h2>
        <div style={{
          background: 'black',
          padding: '10px',
          borderRadius: '5px',
          border: '2px solid #333'
        }}>
          <iframe
            id="overlay-iframe"
            src={overlayUrl}
            style={{
              width: '100%',
              height: '400px',
              border: 'none',
              borderRadius: '5px'
            }}
            title="Overlay Test"
          />
        </div>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '15px',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0, fontSize: '14px' }}>
          💡 실제 OBS에서는 이 iframe과 동일한 방식으로 오버레이 페이지가 로드됩니다.<br/>
          PostMessage는 부모 윈도우(메인 페이지)에서 iframe(오버레이)로 데이터를 전송하는 방식입니다.
        </p>
      </div>
    </div>
  );
}