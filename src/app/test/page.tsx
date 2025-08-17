'use client';

import React, { useState, useEffect } from 'react';

export default function TestPage() {
  const [apiData, setApiData] = useState(null);
  const [lastUpdate, setLastUpdate] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/subtitle');
        if (response.ok) {
          const data = await response.json();
          setApiData(data);
          setLastUpdate(new Date().toLocaleTimeString());
        }
      } catch (error) {
        console.error('API 테스트 실패:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🧪 API 테스트 페이지</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-600">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">실시간 자막 API 데이터</h2>
            <div className="text-sm text-gray-400">
              마지막 업데이트: {lastUpdate}
            </div>
          </div>
          
          {apiData ? (
            <pre className="bg-gray-900 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(apiData, null, 2)}
            </pre>
          ) : (
            <div className="text-gray-400">데이터 로딩 중...</div>
          )}
        </div>
        
        <div className="mt-6 text-sm text-gray-400">
          <p>💡 이 페이지는 OBS에서 사용하는 API 엔드포인트를 테스트합니다.</p>
          <p>컨트롤 페이지에서 음성 인식을 시작하면 여기서도 실시간으로 데이터가 업데이트됩니다.</p>
        </div>
      </div>
    </div>
  );
}