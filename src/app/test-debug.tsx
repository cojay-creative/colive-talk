'use client';

import React, { useState } from 'react';

export default function TestDebug() {
  const [count, setCount] = useState(0);
  
  console.log('🔧 테스트 페이지 렌더링');
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">🔧 디버그 테스트</h1>
        
        <div className="space-y-4">
          <p className="text-gray-600">현재 카운트: {count}</p>
          
          <button
            onClick={() => {
              console.log('버튼 클릭됨!');
              setCount(count + 1);
            }}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
          >
            클릭 테스트 (+1)
          </button>
          
          <button
            onClick={() => {
              console.log('리셋 버튼 클릭됨!');
              setCount(0);
            }}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
          >
            리셋
          </button>
        </div>
      </div>
    </div>
  );
}