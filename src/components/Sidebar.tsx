import React from 'react';

interface SidebarProps {
  isDarkMode: boolean;
  currentSection: string;
  setCurrentSection: (section: string) => void;
}

const menuItems = [
  { id: 'control', label: '음성 인식 컨트롤', icon: '🎤' },
  { id: 'settings', label: '언어 설정', icon: '🌍' },
  { id: 'realtime', label: '실시간 설정', icon: '⚡' },
  { id: 'layout', label: '레이아웃 설정', icon: '⚙️' },
  { id: 'font', label: '폰트 설정', icon: '✍️' },
  { id: 'background', label: '배경 설정', icon: '🎨' },
  { id: 'broadcast', label: '송출프로그램 연동', icon: '📺' }
];

export default function Sidebar({
  isDarkMode,
  currentSection,
  setCurrentSection
}: SidebarProps) {
  return (
    <aside className={`w-64 shadow-lg border-r transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="p-4">
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentSection(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                currentSection === item.id
                  ? isDarkMode 
                    ? 'bg-[#00B1A9]/20 text-[#00B1A9] border border-[#00B1A9]/30 shadow-md'
                    : 'bg-[#00B1A9]/10 text-[#00B1A9] border border-[#00B1A9]/20 shadow-md'
                  : isDarkMode
                    ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}
