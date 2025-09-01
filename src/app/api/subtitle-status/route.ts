import { NextRequest, NextResponse } from 'next/server';
import { broadcastUpdate } from '../subtitle-events/route';

// 사용자별 세션 데이터 저장소 (sessionId를 키로 사용)
const userSessions = new Map<string, {
  originalText: string;
  translatedText: string;
  isListening: boolean;
  isTranslating: boolean;
  timestamp: number;
  lastActivity: number;
}>();

// Edge Requests 절약을 위한 중복 방지 캐시
const requestCache = new Map<string, { data: any, timestamp: number }>();

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
    
    // Edge Requests 절약을 위한 서버 사이드 중복 방지
    const cacheKey = `${sessionId}_${subtitleData.originalText || ''}_${subtitleData.translatedText || ''}_${subtitleData.isListening}`;
    const cached = requestCache.get(cacheKey);
    
    // 동일한 데이터가 2초 이내에 들어온 경우 무시 (Edge Requests 절약)
    if (cached && (Date.now() - cached.timestamp) < 2000) {
      console.log('🚫 서버 중복 방지 (Edge Requests 절약):', cacheKey);
      return NextResponse.json({
        success: true,
        cached: true,
        message: 'Duplicate request ignored',
        data: cached.data
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }
    
    const newData = {
      originalText: subtitleData.originalText || '',
      translatedText: subtitleData.translatedText || '',
      isListening: subtitleData.isListening || false,
      isTranslating: subtitleData.isTranslating || false,
      timestamp: Date.now(),
      lastActivity: Date.now()
    };
    
    // 캐시 업데이트 (Edge Requests 절약)
    requestCache.set(cacheKey, { data: newData, timestamp: Date.now() });
    
    // 캐시 크기 제한 (메모리 절약)
    if (requestCache.size > 100) {
      const oldestKey = requestCache.keys().next().value;
      requestCache.delete(oldestKey);
    }
    
    userSessions.set(sessionId, newData);
    
    // SSE를 통해 연결된 클라이언트들에게 즉시 브로드캐스트 (Edge Requests 절약!)
    broadcastUpdate(sessionId, newData);
    
    console.log(`📡 세션 ${sessionId} 데이터 업데이트 및 SSE 브로드캐스트:`, {
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