// 무료 번역 서비스 (최적화된 속도)
export class FreeTranslationService {
  // CORS 문제가 있는 서버들 제거하고 안정적인 서비스만 사용
  private services = [
    { url: 'https://api.mymemory.translated.net/get', type: 'mymemory' },
    { url: 'https://libretranslate.com/translate', type: 'libretranslate' } // 400 오류는 있지만 CORS는 통과
    // CORS 문제로 제거: libretranslate.de, translate.fedilab.app, translate.terraprint.co
  ];
  
  private cache = new Map<string, {translation: string, timestamp: number}>();
  private readonly CACHE_SIZE = 100;
  private readonly CACHE_EXPIRE_TIME = 30 * 1000; // 30초 후 캐시 만료
  private lastApiCall = 0;
  private readonly MIN_API_INTERVAL = 20; // 초고속 응답: 20ms
  
  // 확장된 폴백 번역 (키워드 기반) - CORS 오류 대응
  private fallbackTranslations: { [key: string]: { [key: string]: { [key: string]: string } } } = {
    'ko': {
      'en': {
        // 기본 인사말
        '안녕하세요': 'Hello',
        '안녕': 'Hi',
        '감사합니다': 'Thank you',
        '고맙습니다': 'Thank you',
        '죄송합니다': 'Sorry',
        '미안합니다': 'Sorry',
        '실례합니다': 'Excuse me',
        '안녕히 가세요': 'Goodbye',
        '잘가요': 'Bye',
        
        // 기본 응답
        '네': 'Yes',
        '예': 'Yes', 
        '아니요': 'No',
        '아니에요': 'No',
        '맞아요': 'That\'s right',
        '틀려요': 'That\'s wrong',
        '모르겠어요': 'I don\'t know',
        '알겠습니다': 'I understand',
        
        // 감정 표현
        '좋아요': 'Good',
        '좋다': 'Good',
        '나빠요': 'Bad',
        '나쁘다': 'Bad',
        '괜찮아요': 'It\'s okay',
        '괜찮다': 'It\'s okay',
        '기뻐요': 'I\'m happy',
        '슬퍼요': 'I\'m sad',
        '화나요': 'I\'m angry',
        '놀라워요': 'Amazing',
        
        // 일상 표현
        '맛있어요': 'Delicious',
        '맛있다': 'Delicious',
        '맛없어요': 'Not tasty',
        '뜨거워요': 'It\'s hot',
        '차가워요': 'It\'s cold',
        '크다': 'Big',
        '작다': 'Small',
        '빨라요': 'Fast',
        '느려요': 'Slow',
        
        // 질문/요청
        '뭐예요': 'What is it?',
        '어디예요': 'Where is it?',
        '언제예요': 'When is it?',
        '왜요': 'Why?',
        '어떻게': 'How?',
        '도와주세요': 'Please help me',
        '기다려주세요': 'Please wait',
        
        // 자주 사용되는 단어들
        '물': 'water',
        '밥': 'rice/food', 
        '집': 'house',
        '학교': 'school',
        '회사': 'company',
        '친구': 'friend',
        '가족': 'family',
        '시간': 'time',
        '돈': 'money',
        '일': 'work'
      }
    }
  };
  
  // 지원하는 언어 목록
  private supportedLanguages = {
    'ko': 'Korean',
    'en': 'English',
    'ja': 'Japanese',
    'zh': 'Chinese',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'ru': 'Russian',
    'pt': 'Portuguese',
    'it': 'Italian'
  };

  // 캐시 키 생성
  private getCacheKey(text: string, sourceLang: string, targetLang: string): string {
    return `${sourceLang}:${targetLang}:${text.toLowerCase().trim()}`;
  }

  // 캐시에서 번역 조회 (만료 시간 체크)
  private getFromCache(text: string, sourceLang: string, targetLang: string): string | null {
    const key = this.getCacheKey(text, sourceLang, targetLang);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // 캐시 만료 체크
    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_EXPIRE_TIME) {
      console.log('🗑️ 캐시 만료로 삭제:', text.substring(0, 30));
      this.cache.delete(key);
      return null;
    }
    
    return cached.translation;
  }

  // 캐시에 번역 저장 (타임스탬프 포함)
  private saveToCache(text: string, sourceLang: string, targetLang: string, translation: string) {
    const key = this.getCacheKey(text, sourceLang, targetLang);
    
    // 캐시 크기 제한
    if (this.cache.size >= this.CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value as string;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      translation,
      timestamp: Date.now()
    });
  }

  // API 호출 간격 제한
  private async waitForApiInterval() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;
    if (timeSinceLastCall < this.MIN_API_INTERVAL) {
      const waitTime = this.MIN_API_INTERVAL - timeSinceLastCall;
      console.log(`⏳ API 호출 간격 제한으로 ${waitTime}ms 대기`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastApiCall = Date.now();
  }

  // MyMemory API 호출 (가장 빠름)
  private async translateWithMyMemory(text: string, sourceLang: string, targetLang: string): Promise<string | null> {
    try {
      // API 호출 간격 제한
      await this.waitForApiInterval();
      
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
      console.log(`🌐 MyMemory API 호출: ${url}`);
      
      const response = await fetch(url, { 
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      console.log(`📡 MyMemory 응답 상태: ${response.status}`);
      
      if (response.status === 429) {
        console.log('⚠️ MyMemory API 제한 - 0.5초 후 재시도');
        await new Promise(resolve => setTimeout(resolve, 500));
        // 한 번 더 시도
        const retryResponse = await fetch(url, { 
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        
        if (retryResponse.ok) {
          const data = await retryResponse.json();
          if (data.responseStatus === 200 && data.responseData.translatedText) {
            const translated = data.responseData.translatedText;
            console.log(`✅ MyMemory 재시도 번역 성공: "${translated}"`);
            return translated;
          }
        }
        console.log('❌ MyMemory 재시도도 실패');
        return null;
      }
      
      if (response.ok) {
        const data = await response.json();
        console.log('📄 MyMemory 응답 데이터:', data);
        
        if (data.responseStatus === 200 && data.responseData.translatedText) {
          const translated = data.responseData.translatedText;
          console.log(`✅ MyMemory 번역 성공: "${translated}"`);
          return translated;
        } else {
          console.log(`❌ MyMemory 번역 실패 - responseStatus: ${data.responseStatus}, translatedText: ${data.responseData?.translatedText}`);
        }
      } else {
        console.log(`❌ MyMemory HTTP 오류: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.warn('❌ MyMemory API 오류:', error);
    }
    return null;
  }

  // LibreTranslate API 호출
  private async translateWithLibre(url: string, text: string, sourceLang: string, targetLang: string): Promise<string | null> {
    try {
      console.log(`🌐 LibreTranslate API 호출: ${url}`);
      
      // 타임아웃 설정 (2초로 단축 - 빠른 응답)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log(`📡 LibreTranslate 응답 상태 (${url}): ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`📄 LibreTranslate 응답 데이터 (${url}):`, data);
        
        const translated = data.translatedText || data.translation || null;
        if (translated) {
          console.log(`✅ LibreTranslate 번역 성공 (${url}): "${translated}"`);
          return translated;
        }
      } else {
        console.log(`❌ LibreTranslate HTTP 오류 (${url}): ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.warn(`⏰ LibreTranslate 타임아웃 (${url})`);
      } else {
        console.warn(`❌ LibreTranslate 오류 (${url}):`, error);
      }
    }
    return null;
  }

  // 폴백 번역 (키워드 기반)
  private tryFallbackTranslation(text: string, sourceLang: string, targetLang: string): string | null {
    const cleanText = text.trim();
    const fallbackDict = this.fallbackTranslations[sourceLang]?.[targetLang];
    
    if (!fallbackDict) {
      return null;
    }
    
    // 정확히 일치하는 키워드 찾기
    if (fallbackDict[cleanText]) {
      console.log(`🔄 폴백 번역 성공: "${cleanText}" → "${fallbackDict[cleanText]}"`);
      return fallbackDict[cleanText] as string;
    }
    
    // 부분 일치 찾기
    for (const [korean, english] of Object.entries(fallbackDict)) {
      if (cleanText.includes(korean)) {
        const result = cleanText.replace(korean, english as string);
        console.log(`🔄 폴백 부분 번역: "${cleanText}" → "${result}"`);
        return result;
      }
    }
    
    return null;
  }

  // 병렬 번역 시도 (속도 최적화)
  async translate(text: string, targetLang: string, sourceLang: string = 'auto'): Promise<string> {
    // 같은 언어면 번역하지 않음
    if (sourceLang === targetLang) {
      console.log(`번역 건너뛰기: 같은 언어 (${sourceLang} → ${targetLang})`);
      return text;
    }

    // 빈 텍스트 체크
    if (!text.trim()) {
      console.log('번역 건너뛰기: 빈 텍스트');
      return text;
    }

    // 캐시에서 먼저 확인
    const cached = this.getFromCache(text, sourceLang, targetLang);
    if (cached) {
      console.log('✅ 캐시에서 번역 반환:', cached);
      return cached;
    }

    console.log(`⚡ 초고속 번역 시작: "${text.substring(0, 30)}..." (${sourceLang} → ${targetLang})`);
    const startTime = Date.now();

    try {
      // 폴백 번역을 먼저 확인 (가장 빠름)
      const fallbackResult = this.tryFallbackTranslation(text, sourceLang, targetLang);
      if (fallbackResult) {
        console.log(`⚡ 폴백 번역 즉시 반환 (0ms): ${fallbackResult}`);
        return fallbackResult;
      }

      // MyMemory API 시도 (타임아웃 단축)
      console.log('🔄 MyMemory API 초고속 시도...');
      const myMemoryResult = await Promise.race([
        this.translateWithMyMemory(text, sourceLang, targetLang),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('MyMemory timeout')), 1500)) // 1.5초 타임아웃
      ]);
      
      if (myMemoryResult && myMemoryResult !== text) {
        const elapsed = Date.now() - startTime;
        console.log(`⚡ MyMemory 번역 성공 (${elapsed}ms): ${myMemoryResult}`);
        this.saveToCache(text, sourceLang, targetLang, myMemoryResult);
        return myMemoryResult;
      }
    } catch (error) {
      console.log('⚡ MyMemory 초고속 시도 실패, LibreTranslate로 진행');
    }

    try {
      // MyMemory 실패 시 빠른 폴백 번역 먼저 시도
      console.log('🔄 빠른 폴백 번역 시도 (CORS 오류 대응)...');
      const quickFallback = this.tryFallbackTranslation(text, sourceLang, targetLang);
      if (quickFallback) {
        const elapsed = Date.now() - startTime;
        console.log(`✅ 빠른 폴백 번역 성공 (${elapsed}ms): "${quickFallback}"`);
        this.saveToCache(text, sourceLang, targetLang, quickFallback);
        return quickFallback;
      }

      // LibreTranslate 서비스들 시도 (CORS 문제 있는 서버들 제거됨)
      console.log('🔄 LibreTranslate 서비스 시도 중...');
      const librePromises = this.services
        .filter(s => s.type === 'libretranslate')
        .map(service => this.translateWithLibre(service.url, text, sourceLang, targetLang));

      if (librePromises.length > 0) {
        const results = await Promise.allSettled(librePromises);
        
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const serviceUrl = this.services.filter(s => s.type === 'libretranslate')[i]?.url;
          
          if (result.status === 'fulfilled') {
            if (result.value && result.value !== text) {
              const elapsed = Date.now() - startTime;
              console.log(`✅ LibreTranslate 번역 성공 (${serviceUrl}, ${elapsed}ms): ${result.value}`);
              this.saveToCache(text, sourceLang, targetLang, result.value);
              return result.value;
            } else {
              console.log(`❌ LibreTranslate 번역 실패 또는 동일한 텍스트 (${serviceUrl}):`, result.value);
            }
          } else {
            console.log(`❌ LibreTranslate CORS/네트워크 오류 (${serviceUrl}):`, result.reason);
          }
        }
      }

    } catch (error) {
      console.error('🚨 번역 중 전체 오류 (CORS 포함):', error);
    }

    // 모든 API가 실패했을 때 폴백 번역 시도
    console.log('🔄 폴백 번역 시도 중...');
    const fallbackResult = this.tryFallbackTranslation(text, sourceLang, targetLang);
    if (fallbackResult) {
      const elapsed = Date.now() - startTime;
      console.log(`✅ 폴백 번역 성공 (${elapsed}ms): "${fallbackResult}"`);
      this.saveToCache(text, sourceLang, targetLang, fallbackResult);
      return fallbackResult;
    }

    const elapsed = Date.now() - startTime;
    console.log(`❌ 모든 번역 서비스 및 폴백 실패 (${elapsed}ms), 원본 텍스트 반환: "${text}"`);
    return text;
  }

  // 지원하는 언어 목록 반환
  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  // 언어 코드가 지원되는지 확인
  isLanguageSupported(langCode: string): boolean {
    return langCode in this.supportedLanguages;
  }
}

// 싱글톤 인스턴스
export const freeTranslationService = new FreeTranslationService();
