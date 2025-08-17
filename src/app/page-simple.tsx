'use client';

import React, { useState } from 'react';

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [text, setText] = useState('');
  
  console.log('🎯 홈 페이지 렌더링');
  
  const toggleListening = () => {
    console.log('🎤 음성 인식 토글 클릭');
    setIsListening(!isListening);
    if (!isListening) {
      setText('테스트 음성 인식 결과');
    }
  };
  
  const toggleDarkMode = () => {
    console.log('🌙 다크모드 토글 클릭');
    setIsDarkMode(!isDarkMode);
  };
  
  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* 헤더 */}
      <header className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm border-b`}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Colive Talk
            </h1>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-md transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <span className="text-sm">{isDarkMode ? '☀️' : '🌙'}</span>
              </button>
              
              <button
                onClick={toggleListening}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  isListening
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-[#00B1A9] hover:bg-[#008F87] text-white'
                }`}
              >
                <span className="text-xs">{isListening ? '🎤 중지' : '🎤 시작'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="p-4">
        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg p-4 shadow-sm border`}>
          <h2 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            🎤 음성 인식 테스트
          </h2>
          
          <div className="space-y-4">
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              상태: {isListening ? '🟢 활성' : '🔴 비활성'}
            </p>
            
            {text && (
              <div className="p-4 bg-gray-50 rounded border">
                <p className="text-gray-800">결과: {text}</p>
              </div>
            )}
            
            <button
              onClick={() => setText('')}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
            >
              텍스트 지우기
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}