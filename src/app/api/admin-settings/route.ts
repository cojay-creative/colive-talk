import { NextRequest, NextResponse } from 'next/server';

// 글로벌 관리자 설정 저장소
let adminSettings = {
  inactiveMessage: '안녕하세요! 음성인식을 시작해주세요 🎤',
  defaultWelcomeMessage: 'Colive Talk에 오신 것을 환영합니다!',
  listeningMessage: '음성을 듣고 있습니다...',
  translatingMessage: '번역 중...',
  lastUpdated: Date.now()
};

export async function GET() {
  return NextResponse.json({
    success: true,
    settings: adminSettings,
    timestamp: Date.now()
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 관리자 설정 업데이트
    adminSettings = {
      ...adminSettings,
      ...body,
      lastUpdated: Date.now()
    };
    
    console.log('📋 관리자 설정 업데이트:', {
      inactiveMessage: adminSettings.inactiveMessage,
      listeningMessage: adminSettings.listeningMessage,
      lastUpdated: new Date(adminSettings.lastUpdated).toISOString()
    });
    
    return NextResponse.json({
      success: true,
      message: '관리자 설정이 업데이트되었습니다.',
      settings: adminSettings
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error) {
    console.error('❌ 관리자 설정 저장 실패:', error);
    return NextResponse.json({
      success: false,
      error: '설정 저장에 실패했습니다.'
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}