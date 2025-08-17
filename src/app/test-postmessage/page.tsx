'use client';

import React, { useState, useEffect } from 'react';

interface MessageData {
  type: string;
  originalText: string;
  translatedText: string;
  isListening: boolean;
  isTranslating: boolean;
  timestamp: number;
}

export default function TestPostMessagePage() {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [lastMessage, setLastMessage] = useState<MessageData | null>(null);

  useEffect(() => {
    const handlePostMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SUBTITLE_UPDATE') {
        console.log('🧪 테스트 페이지 PostMessage 수신:', event.data);
        const messageData: MessageData = event.data;
        
        setLastMessage(messageData);
        setMessages(prev => [messageData, ...prev.slice(0, 9)]); // 최근 10개만 유지
      }
    };

    window.addEventListener('message', handlePostMessage);
    console.log('🎧 PostMessage 테스트 리스너 설정 완료');

    return () => {
      window.removeEventListener('message', handlePostMessage);
      console.log('🔌 PostMessage 테스트 리스너 해제');
    };
  }, []);

  const getCurrentDisplay = () => {
    if (!lastMessage) return '대기 중...';
    
    if (lastMessage.translatedText) {
      return lastMessage.translatedText;
    }
    
    if (lastMessage.originalText) {
      return lastMessage.originalText;
    }
    
    if (!lastMessage.isListening) {
      return '안녕하세요! 음성인식을 시작해주세요 🎤';
    }
    
    return '음성을 듣고 있습니다...';
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
      color: 'white'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <h1 style={{
          fontSize: '2rem',
          marginBottom: '20px',
          textAlign: 'center',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
        }}>
          PostMessage 테스트 페이지 (OBS 시뮬레이션)
        </h1>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '30px'
        }}>
          {/* 현재 자막 표시 (OBS 스타일) */}
          <div style={{
            background: 'rgba(0,0,0,0.8)',
            padding: '20px',
            borderRadius: '10px',
            border: '2px solid rgba(255,255,255,0.3)'
          }}>
            <h2 style={{ marginBottom: '15px', fontSize: '1.2rem' }}>현재 자막 (OBS 스타일)</h2>
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
              {getCurrentDisplay()}
            </div>
          </div>

          {/* 상태 정보 */}
          <div style={{
            background: 'rgba(0,0,0,0.8)',
            padding: '20px',
            borderRadius: '10px',
            border: '2px solid rgba(255,255,255,0.3)'
          }}>
            <h2 style={{ marginBottom: '15px', fontSize: '1.2rem' }}>현재 상태</h2>
            {lastMessage ? (
              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                <div><strong>듣기 상태:</strong> {lastMessage.isListening ? '🟢 듣는 중' : '🔴 정지'}</div>
                <div><strong>번역 상태:</strong> {lastMessage.isTranslating ? '🔄 번역 중' : '✅ 완료'}</div>
                <div><strong>원본 텍스트:</strong> {lastMessage.originalText || '없음'}</div>
                <div><strong>번역 텍스트:</strong> {lastMessage.translatedText || '없음'}</div>
                <div><strong>타임스탬프:</strong> {new Date(lastMessage.timestamp).toLocaleTimeString()}</div>
              </div>
            ) : (
              <div style={{ color: '#aaa' }}>메시지 대기 중...</div>
            )}
          </div>
        </div>

        {/* 메시지 히스토리 */}
        <div style={{
          background: 'rgba(0,0,0,0.8)',
          padding: '20px',
          borderRadius: '10px',
          border: '2px solid rgba(255,255,255,0.3)'
        }}>
          <h2 style={{ marginBottom: '15px', fontSize: '1.2rem' }}>메시지 히스토리 (최근 10개)</h2>
          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            fontSize: '12px'
          }}>
            {messages.length === 0 ? (
              <div style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>
                아직 메시지가 없습니다.<br/>
                메인 페이지에서 음성 인식을 시작해보세요.
              </div>
            ) : (
              messages.map((msg, index) => (
                <div key={index} style={{
                  background: 'rgba(255,255,255,0.1)',
                  margin: '5px 0',
                  padding: '10px',
                  borderRadius: '5px',
                  borderLeft: '4px solid #00ff88'
                }}>
                  <div><strong>시간:</strong> {new Date(msg.timestamp).toLocaleTimeString()}</div>
                  <div><strong>듣기:</strong> {msg.isListening ? '✅' : '❌'} | <strong>번역중:</strong> {msg.isTranslating ? '🔄' : '✅'}</div>
                  {msg.originalText && <div><strong>원본:</strong> {msg.originalText}</div>}
                  {msg.translatedText && <div><strong>번역:</strong> {msg.translatedText}</div>}
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{
          marginTop: '20px',
          textAlign: 'center',
          background: 'rgba(255,255,255,0.1)',
          padding: '15px',
          borderRadius: '8px'
        }}>
          <p style={{ margin: 0, fontSize: '14px' }}>
            💡 메인 페이지 (localhost:3000)에서 음성 인식을 시작하면 여기서 실시간으로 PostMessage를 받을 수 있습니다.<br/>
            이 페이지는 OBS 브라우저 소스가 메시지를 받는 방식을 시뮬레이션합니다.
          </p>
        </div>
      </div>
    </div>
  );
}