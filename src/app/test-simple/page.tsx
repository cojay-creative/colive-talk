'use client';

import React from 'react';

export default function TestSimplePage() {
  return (
    <div className="min-h-screen bg-blue-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-blue-600 mb-4">
          🧪 간단한 테스트 페이지
        </h1>
        <p className="text-gray-700 mb-4">
          이 페이지가 보인다면 Next.js와 Tailwind CSS는 정상 작동하고 있습니다.
        </p>
        <div className="bg-green-100 p-4 rounded border border-green-300">
          <p className="text-green-800">
            ✅ React 컴포넌트 렌더링 성공
          </p>
        </div>
        <div className="mt-4">
          <a 
            href="/" 
            className="text-blue-500 hover:text-blue-700 underline"
          >
            메인 페이지로 돌아가기
          </a>
        </div>
      </div>
    </div>
  );
}
