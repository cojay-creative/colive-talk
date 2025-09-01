'use client';

import React from 'react';

console.log('📄 page-simple.tsx 파일 로드됨');

export default function SimpleHome() {
  console.log('🏠 SimpleHome 컴포넌트 렌더링 시작');
  
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
          ✅ 기본 JavaScript 실행 테스트 성공
        </code>
      </div>
    </div>
  );
}