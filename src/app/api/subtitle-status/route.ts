import { NextRequest, NextResponse } from 'next/server';

// 사용자별 세션 데이터 저장소 (sessionId를 키로 사용)
const userSessions = new Map<string, {
  originalText: string;
  translatedText: string;
  isListening: boolean;
  isTranslating: boolean;
  timestamp: number;
  lastActivity: number;
}>();

// 5분 이상 비활성 세션 정리
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5분
const cleanupInactiveSessions = () => {
  const now = Date.now();
  for (const [sessionId, data] of userSessions.entries()) {
    if (now - data.lastActivity > CLEANUP_INTERVAL) {
      userSessions.delete(sessionId);
      console.log(`🧹 비활성 세션 정리: ${sessionId}`);
    }
  }
};

// 주기적 정리 (10분마다)
setInterval(cleanupInactiveSessions, 10 * 60 * 1000);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  
  if (!sessionId) {
    return NextResponse.json({
      success: false,
      error: 'sessionId is required'
    }, { status: 400 });
  }
  
  const sessionData = userSessions.get(sessionId) || {
    originalText: '',
    translatedText: '',
    isListening: false,
    isTranslating: false,
    timestamp: 0,
    lastActivity: Date.now()
  };
  
  // 마지막 활성 시간 업데이트
  sessionData.lastActivity = Date.now();
  userSessions.set(sessionId, sessionData);
  
  return NextResponse.json({
    success: true,
    data: sessionData,
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
    const { sessionId, ...subtitleData } = body;
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'sessionId is required'
      }, { status: 400 });
    }
    
    const newData = {
      originalText: subtitleData.originalText || '',
      translatedText: subtitleData.translatedText || '',
      isListening: subtitleData.isListening || false,
      isTranslating: subtitleData.isTranslating || false,
      timestamp: Date.now(),
      lastActivity: Date.now()
    };
    
    userSessions.set(sessionId, newData);
    
    console.log(`📡 세션 ${sessionId} 데이터 업데이트:`, {
      originalText: newData.originalText,
      translatedText: newData.translatedText,
      isListening: newData.isListening
    });
    
    return NextResponse.json({
      success: true,
      message: 'Updated',
      data: newData
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error) {
    console.error('❌ API 업데이트 실패:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update'
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