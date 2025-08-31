'use client';

import React, { useState, useEffect } from 'react';

export default function OBSDebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [apiData, setApiData] = useState<any>(null);
  const [globalData, setGlobalData] = useState<any>(null);
  const [localStorageData, setLocalStorageData] = useState<any>(null);

  useEffect(() => {
    const checkEnvironment = () => {
      const info = {
        userAgent: navigator.userAgent,
        isOBS: navigator.userAgent.includes('CEF') || navigator.userAgent.includes('obs-browser'),
        hasOpener: !!window.opener,
        origin: window.location.origin,
        href: window.location.href,
        timestamp: new Date().toISOString()
      };
      setDebugInfo(info);
    };

    const checkLocalStorage = () => {
      try {
        const stored = localStorage.getItem('subtitle_sync_data');
        setLocalStorageData(stored ? JSON.parse(stored) : null);
      } catch (error) {
        setLocalStorageData({ error: (error as Error).message });
      }
    };

    const checkGlobalData = () => {
      try {
        setGlobalData((window as any).SUBTITLE_DATA || null);
      } catch (error) {
        setGlobalData({ error: (error as Error).message });
      }
    };

    const checkAPI = async () => {
      try {
        const response = await fetch('/api/subtitle-status');
        const data = await response.json();
        setApiData(data);
      } catch (error) {
        setApiData({ error: (error as Error).message });
      }
    };

    checkEnvironment();
    checkLocalStorage();
    checkGlobalData();
    checkAPI();

    // 5초마다 업데이트
    const interval = setInterval(() => {
      checkLocalStorage();
      checkGlobalData();
      checkAPI();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const InfoSection = ({ title, data }: { title: string; data: any }) => (
    <div style={{
      background: 'rgba(0,0,0,0.8)',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '15px',
      border: '1px solid #333'
    }}>
      <h3 style={{ color: '#00ff00', marginBottom: '10px', fontSize: '16px' }}>{title}</h3>
      <pre style={{
        color: '#ffffff',
        fontSize: '12px',
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        margin: 0,
        overflow: 'auto',
        maxHeight: '200px'
      }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      color: 'white'
    }}>
      <h1 style={{
        textAlign: 'center',
        marginBottom: '30px',
        color: '#00ff88',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
      }}>
        OBS 디버그 페이지
      </h1>
      
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        <InfoSection title="환경 정보" data={debugInfo} />
        <InfoSection title="localStorage 데이터" data={localStorageData} />
        <InfoSection title="글로벌 객체 데이터" data={globalData} />
        <InfoSection title="API 데이터" data={apiData} />
      </div>

      <div style={{
        marginTop: '30px',
        padding: '20px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <h3 style={{ marginBottom: '15px' }}>사용 방법</h3>
        <p style={{ fontSize: '14px', lineHeight: '1.6' }}>
          1. OBS에서 브라우저 소스를 추가하고 이 페이지 URL을 입력하세요.<br/>
          2. 메인 페이지에서 음성 인식을 시작하고 여기서 데이터가 수신되는지 확인하세요.<br/>
          3. 데이터가 수신되지 않으면 localStorage, 글로벌 객체, API 섹션을 확인하세요.<br/>
          4. 디버그 정보를 스크린샷으로 캡처하여 문제를 분석할 수 있습니다.
        </p>
      </div>
    </div>
  );
}