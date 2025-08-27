'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AdminSettings {
  inactiveMessage: string;
  defaultWelcomeMessage: string;
  listeningMessage: string;
  translatingMessage: string;
}

const ADMIN_PASSWORD = 'colive2024!admin'; // 실제로는 환경변수에서 가져와야 함

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [settings, setSettings] = useState<AdminSettings>({
    inactiveMessage: '안녕하세요! 음성인식을 시작해주세요 🎤',
    defaultWelcomeMessage: 'Colive Talk에 오신 것을 환영합니다!',
    listeningMessage: '음성을 듣고 있습니다...',
    translatingMessage: '번역 중...'
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // 로컬스토리지에서 설정 로드
  useEffect(() => {
    const savedSettings = localStorage.getItem('admin_overlay_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('설정 로드 실패:', error);
      }
    }
  }, []);

  // 인증 체크
  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPassword('');
    } else {
      alert('올바르지 않은 비밀번호입니다.');
    }
  };

  // 설정 저장
  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      localStorage.setItem('admin_overlay_settings', JSON.stringify(settings));
      
      // API로도 전송 (글로벌 설정으로)
      await fetch('/api/admin-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('설정 저장 실패:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  // 미인증 상태
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">관리자 로그인</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                관리자 비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="비밀번호를 입력하세요"
              />
            </div>
            <button
              onClick={handleLogin}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              로그인
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              메인으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 인증된 상태 - 관리자 설정
  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-white">관리자 설정</h1>
            <button
              onClick={() => router.push('/')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              메인으로 돌아가기
            </button>
          </div>

          <div className="space-y-6">
            {/* 비활성 상태 메시지 */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3">🎤 음성인식 비활성 상태 메시지</h3>
              <input
                type="text"
                value={settings.inactiveMessage}
                onChange={(e) => setSettings(prev => ({ ...prev, inactiveMessage: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="음성인식이 꺼져있을 때 표시될 메시지"
              />
              <p className="text-sm text-gray-400 mt-2">
                음성인식을 시작하지 않았을 때 OBS에 표시되는 메시지입니다.
              </p>
            </div>

            {/* 환영 메시지 */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3">👋 기본 환영 메시지</h3>
              <input
                type="text"
                value={settings.defaultWelcomeMessage}
                onChange={(e) => setSettings(prev => ({ ...prev, defaultWelcomeMessage: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="페이지 로드시 표시될 환영 메시지"
              />
              <p className="text-sm text-gray-400 mt-2">
                사이트에 처음 접속했을 때 표시되는 환영 메시지입니다.
              </p>
            </div>

            {/* 음성 듣는 중 메시지 */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3">👂 음성 인식 중 메시지</h3>
              <input
                type="text"
                value={settings.listeningMessage}
                onChange={(e) => setSettings(prev => ({ ...prev, listeningMessage: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="음성을 듣고 있을 때 표시될 메시지"
              />
              <p className="text-sm text-gray-400 mt-2">
                음성인식이 활성화되었지만 아직 말하지 않았을 때의 메시지입니다.
              </p>
            </div>

            {/* 번역 중 메시지 */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3">🌍 번역 중 메시지</h3>
              <input
                type="text"
                value={settings.translatingMessage}
                onChange={(e) => setSettings(prev => ({ ...prev, translatingMessage: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="번역 작업 중일 때 표시될 메시지"
              />
              <p className="text-sm text-gray-400 mt-2">
                음성인식이 완료되고 번역을 진행중일 때의 메시지입니다.
              </p>
            </div>

            {/* 저장 버튼 */}
            <div className="flex justify-center pt-6">
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
                  saveStatus === 'saving' 
                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                    : saveStatus === 'saved'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : saveStatus === 'error'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {saveStatus === 'saving' && '저장 중...'}
                {saveStatus === 'saved' && '✅ 저장 완료!'}
                {saveStatus === 'error' && '❌ 저장 실패'}
                {saveStatus === 'idle' && '💾 설정 저장'}
              </button>
            </div>
          </div>

          {/* 미리보기 */}
          <div className="mt-8 bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-3">🔍 미리보기</h3>
            <div className="bg-black rounded-lg p-4 text-center">
              <div className="text-white text-xl font-bold mb-2">
                현재 설정된 메시지들:
              </div>
              <div className="space-y-2 text-gray-300">
                <div>비활성: "{settings.inactiveMessage}"</div>
                <div>환영: "{settings.defaultWelcomeMessage}"</div>
                <div>듣는중: "{settings.listeningMessage}"</div>
                <div>번역중: "{settings.translatingMessage}"</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}