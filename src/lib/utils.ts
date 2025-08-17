// 색상 관련 유틸리티 함수들
export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// 언어 코드 매핑 함수
export const getSourceLanguageCode = (speechLang: string): string => {
  const mapping: { [key: string]: string } = {
    'ko-KR': 'ko',
    'en-US': 'en',
    'ja-JP': 'ja',
    'zh-CN': 'zh',
    'es-ES': 'es'
  };
  const result = mapping[speechLang] || 'ko';
  console.log(`🗣️ 언어 코드 매핑: ${speechLang} → ${result}`);
  return result;
};

// 현재 URL 가져오기
export const getCurrentUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:3000';
};

// 클립보드 복사 함수
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('클립보드 복사 실패:', err);
    return false;
  }
};

// 텍스트 분할 처리 함수
export const processLongText = async (
  text: string,
  maxLength: number = 200,
  translateFunction: (text: string, targetLang: string, sourceLang: string) => Promise<string>
): Promise<string> => {
  if (text.length <= maxLength) {
    return await translateFunction(text, 'en', 'ko');
  }

  const sentences = text.split(/[.!?。！？]/);
  let currentChunk = '';
  let translatedParts: string[] = [];

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += sentence;
    } else {
      if (currentChunk.trim()) {
        const translated = await translateFunction(
          currentChunk.trim(), 
          'en', 
          'ko'
        );
        translatedParts.push(translated);
      }
      currentChunk = sentence;
    }
  }

  if (currentChunk.trim()) {
    const translated = await translateFunction(
      currentChunk.trim(), 
      'en', 
      'ko'
    );
    translatedParts.push(translated);
  }

  return translatedParts.join(' ');
};
