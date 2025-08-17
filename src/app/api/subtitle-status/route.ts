import { NextRequest, NextResponse } from 'next/server';

// 간단한 인메모리 스토어
let subtitleData = {
  originalText: '',
  translatedText: '',
  isListening: false,
  isTranslating: false,
  timestamp: 0
};

export async function GET() {
  return NextResponse.json({
    success: true,
    data: subtitleData,
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
    
    subtitleData = {
      originalText: body.originalText || '',
      translatedText: body.translatedText || '',
      isListening: body.isListening || false,
      isTranslating: body.isTranslating || false,
      timestamp: Date.now()
    };
    
    return NextResponse.json({
      success: true,
      message: 'Updated',
      data: subtitleData
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error) {
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