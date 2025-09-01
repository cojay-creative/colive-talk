'use client';

import React, { useEffect } from 'react';

console.log('📄 page-simple.tsx 파일 로드됨');

export default function SimpleHome() {
  console.log('🏠 SimpleHome 컴포넌트 렌더링 시작');
  
  // 클라이언트 사이드에서만 실행
  useEffect(() => {
    // console.log 대신 다른 방법들 시도
    console.log('🌐 useEffect 실행됨 - 클라이언트 사이드');
    console.warn('⚠️ console.warn 테스트');
    console.error('❌ console.error 테스트 (무시하세요)');
    console.info('ℹ️ console.info 테스트');
    
    // DOM에 직접 정보 표시
    const debugDiv = document.getElementById('debug-info');
    if (debugDiv) {
      debugDiv.innerHTML = `
        <strong>🔍 실행 확인:</strong><br/>
        - useEffect 실행됨: ${new Date().toLocaleTimeString()}<br/>
        - 브라우저 환경: ${typeof window !== 'undefined'}<br/>
        - User Agent: ${navigator.userAgent.substring(0, 50)}...
      `;
    }
  }, []);
  
  try {
    console.log('✅ 기본 JavaScript 실행 테스트 성공');
  } catch (e) {
    console.error('❌ 기본 JavaScript 실행 실패:', e);
  }
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>🔧 디버깅 모드 - Simple Home</h1>
      <p>이 페이지가 보인다면 React 기본 렌더링은 성공한 것입니다.</p>
      <p>F12 개발자 도구 콘솔에서 로그를 확인하세요.</p>
      <div id="debug-info" style={{
        background: '#ffffcc', 
        padding: '10px', 
        border: '2px solid #ff6600', 
        marginBottom: '20px',
        fontFamily: 'monospace'
      }}>
        DOM 업데이트 대기 중...
      </div>
      
      <button 
        onClick={() => {
          // 여러 방법으로 테스트
          console.log('🖱️ 버튼 클릭됨 - console.log');
          console.warn('🖱️ 버튼 클릭됨 - console.warn');
          console.error('🖱️ 버튼 클릭됨 - console.error');
          
          // DOM 업데이트
          const debugDiv = document.getElementById('debug-info');
          if (debugDiv) {
            debugDiv.innerHTML = `
              <strong>🖱️ 버튼 클릭됨!</strong><br/>
              시간: ${new Date().toLocaleTimeString()}<br/>
              콘솔 로그가 나타나지 않는다면 프로덕션 환경에서 제거됨
            `;
          }
          
          alert('버튼 클릭 테스트 성공!');
        }}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        🧪 콘솔 로그 테스트 (클릭)
      </button>
      
      <div style={{ 
        background: '#f0f8ff', 
        padding: '10px', 
        border: '1px solid #ccc', 
        marginTop: '20px' 
      }}>
        <h3>예상되는 콘솔 로그:</h3>
        <code>
          📄 page-simple.tsx 파일 로드됨<br/>
          🏠 SimpleHome 컴포넌트 렌더링 시작<br/>
          ✅ 기본 JavaScript 실행 테스트 성공<br/>
          🌐 useEffect 실행됨 - 클라이언트 사이드<br/>
          (버튼 클릭 시) 🖱️ 버튼 클릭됨 - 이벤트 핸들러 테스트
        </code>
      </div>
    </div>
  );
}