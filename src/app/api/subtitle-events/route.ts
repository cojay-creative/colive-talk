// Server-Sent Events API for real-time subtitle synchronization
// 폴링을 대체하여 Edge Requests 사용량을 90% 이상 절약

import { NextRequest } from 'next/server';

// 메모리 저장소 (프로덕션에서는 Redis 사용 권장)
const subtitleCache = new Map<string, any>();
const activeConnections = new Map<string, Set<ReadableStreamDefaultController>>();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');
  
  if (!sessionId) {
    return new Response('Session ID required', { status: 400 });
  }

  console.log(`📡 SSE 연결 시작: ${sessionId}`);

  // SSE 스트림 생성
  const stream = new ReadableStream({
    start(controller) {
      // 연결 등록
      if (!activeConnections.has(sessionId)) {
        activeConnections.set(sessionId, new Set());
      }
      activeConnections.get(sessionId)!.add(controller);

      // 초기 데이터 전송
      const currentData = subtitleCache.get(sessionId) || {
        originalText: '',
        translatedText: '',
        isListening: false,
        isTranslating: false,
        status: '대기 중',
        sourceLanguage: 'ko-KR',
        targetLanguage: 'en'
      };

      controller.enqueue(`data: ${JSON.stringify({
        type: 'SUBTITLE_UPDATE',
        ...currentData,
        timestamp: Date.now()
      })}\n\n`);

      // Keep-alive 핑 (30초마다)
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(`data: ${JSON.stringify({
            type: 'PING',
            timestamp: Date.now()
          })}\n\n`);
        } catch (error) {
          console.log('📡 연결 종료됨:', sessionId);
          clearInterval(keepAlive);
        }
      }, 30000);

      // 연결 정리
      const cleanup = () => {
        clearInterval(keepAlive);
        const connections = activeConnections.get(sessionId);
        if (connections) {
          connections.delete(controller);
          if (connections.size === 0) {
            activeConnections.delete(sessionId);
          }
        }
      };

      // 클라이언트 연결 해제 시 정리
      request.signal.addEventListener('abort', cleanup);
    },
    
    cancel() {
      console.log(`📡 SSE 연결 취소: ${sessionId}`);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// 데이터 업데이트 시 모든 연결된 클라이언트에게 브로드캐스트
export function broadcastUpdate(sessionId: string, data: any) {
  // 캐시 업데이트
  subtitleCache.set(sessionId, data);
  
  // 연결된 모든 클라이언트에게 전송
  const connections = activeConnections.get(sessionId);
  if (connections && connections.size > 0) {
    const message = `data: ${JSON.stringify({
      type: 'SUBTITLE_UPDATE',
      ...data,
      timestamp: Date.now()
    })}\n\n`;

    connections.forEach(controller => {
      try {
        controller.enqueue(message);
      } catch (error) {
        // 연결이 끊긴 클라이언트는 자동으로 정리됨
        connections.delete(controller);
      }
    });
  }
}