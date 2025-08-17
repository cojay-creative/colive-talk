import React from 'react';

interface HeaderProps {
  isDarkMode: boolean;
  setIsDarkMode: (darkMode: boolean) => void;
  showSubtitlePreview: boolean;
  setShowSubtitlePreview: (show: boolean) => void;
  isListening: boolean;
  toggleListening: () => void;
  status: string;
}

export default function Header({
  isDarkMode,
  setIsDarkMode,
  showSubtitlePreview,
  setShowSubtitlePreview,
  isListening,
  toggleListening,
  status
}: HeaderProps) {
  return (
    <header className={`${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} shadow-lg border-b transition-colors duration-300`}>
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* COJAY 로고 */}
            <div className="flex items-center space-x-3">
              <div className="relative w-16 h-16">
                {/* 로고 이미지 */}
                <img 
                  src="/main-logo-24.png" 
                  alt="COJAY Logo" 
                  className="w-full h-full rounded-xl shadow-lg object-contain"
                />
              </div>
              <div className="flex flex-col">
                <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} tracking-tight`}>
                  Colive Talk
                </h1>
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} font-medium`}>
                  실시간 자막 번역 서비스
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* 다크모드 토글 */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
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
              onClick={() => setShowSubtitlePreview(!showSubtitlePreview)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                showSubtitlePreview 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg' 
                  : 'bg-[#00B1A9] hover:bg-[#008F87] text-white shadow-md hover:shadow-lg'
              }`}
            >
              {showSubtitlePreview ? '📺 미리보기 숨기기' : '📺 미리보기 보기'}
            </button>
            
            <button
              onClick={toggleListening}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isListening
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-md'
                  : 'bg-[#00B1A9] hover:bg-[#008F87] text-white shadow-md hover:shadow-lg'
              }`}
            >
              {isListening ? '🎤 인식 중지' : '🎤 인식 시작'}
            </button>
            
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                isListening ? 'bg-[#00B1A9] animate-pulse' : isDarkMode ? 'bg-gray-500' : 'bg-gray-400'
              }`}></div>
              <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {status}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
