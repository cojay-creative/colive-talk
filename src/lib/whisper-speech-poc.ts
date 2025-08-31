// Whisper 기반 음성인식 POC (Proof of Concept)
import { pipeline } from '@xenova/transformers';

export class WhisperSpeechService {
  private transcriber: any = null;
  private isInitialized = false;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private isListening = false;
  
  // 콜백 함수들
  private onResultCallback: ((text: string) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onStatusCallback: ((status: string) => void) | null = null;

  constructor() {
    console.log('🎙️ Whisper Speech Service 초기화');
  }

  // 기존 Web Speech API와 동일한 인터페이스 유지
  onResult(callback: (text: string) => void) {
    this.onResultCallback = callback;
  }

  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }

  onStatus(callback: (status: string) => void) {
    this.onStatusCallback = callback;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      this.updateStatus('AI 음성인식 모델 로딩 중...');
      console.log('🚀 Whisper 모델 다운로드 시작');

      this.transcriber = await pipeline(
        'automatic-speech-recognition',
        'openai/whisper-base',  // 74MB - 실용적 크기
        {
          device: 'webgpu',  // GPU 가속 시도
          dtype: 'fp16',     // 메모리 최적화
          progress_callback: (progress: any) => {
            const percent = Math.round(progress.progress * 100);
            this.updateStatus(`AI 모델 다운로드: ${percent}%`);
            console.log(`📥 모델 다운로드 진행률: ${percent}%`);
          }
        }
      );

      this.isInitialized = true;
      this.updateStatus('AI 음성인식 준비 완료');
      console.log('✅ Whisper 모델 로딩 완료');

    } catch (error) {
      console.error('❌ Whisper 초기화 실패:', error);
      this.handleError(`Whisper 초기화 실패: ${error}`);
      throw error;
    }
  }

  async start(language: string = 'ko-KR'): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // 마이크 권한 요청
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,  // Whisper 최적화
          channelCount: 1,    // 모노
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      // MediaRecorder 설정
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const audioChunks: BlobPart[] = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        if (audioChunks.length > 0) {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          await this.processAudio(audioBlob);
          audioChunks.length = 0; // 배열 초기화
        }
      };

      // 2초마다 오디오 청크 처리 (실시간 처리)
      this.mediaRecorder.start(2000);
      this.isListening = true;
      this.updateStatus('🎤 AI 음성인식 활성');
      
      console.log('🎙️ Whisper 음성인식 시작');
      return true;

    } catch (error) {
      console.error('❌ 음성인식 시작 실패:', error);
      this.handleError(`음성인식 시작 실패: ${error}`);
      return false;
    }
  }

  stop() {
    try {
      if (this.mediaRecorder && this.isListening) {
        this.mediaRecorder.stop();
        this.isListening = false;
      }

      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }

      this.updateStatus('음성인식 중지');
      console.log('🛑 Whisper 음성인식 중지');

    } catch (error) {
      console.error('❌ 음성인식 중지 중 오류:', error);
      this.handleError(`음성인식 중지 실패: ${error}`);
    }
  }

  private async processAudio(audioBlob: Blob) {
    try {
      if (!this.transcriber || !this.isListening) return;

      console.log('🔄 오디오 처리 시작:', audioBlob.size, 'bytes');
      this.updateStatus('AI 음성 분석 중...');

      // Whisper로 음성 → 텍스트 변환
      const arrayBuffer = await audioBlob.arrayBuffer();
      const result = await this.transcriber(arrayBuffer);
      
      const transcription = result.text?.trim();
      
      if (transcription && transcription.length > 0) {
        console.log('✅ Whisper 음성인식 결과:', transcription);
        this.updateStatus('🎤 AI 음성인식 활성');
        
        // 결과 콜백 호출 (기존 시스템과 호환)
        if (this.onResultCallback) {
          this.onResultCallback(transcription);
        }
      } else {
        console.log('🔇 인식된 음성 없음');
      }

    } catch (error) {
      console.error('❌ 오디오 처리 실패:', error);
      this.handleError(`음성 처리 실패: ${error}`);
    }
  }

  private updateStatus(status: string) {
    if (this.onStatusCallback) {
      this.onStatusCallback(status);
    }
  }

  private handleError(error: string) {
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }

  // 정리 함수
  destroy() {
    this.stop();
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.onStatusCallback = null;
    console.log('🧹 Whisper Speech Service 정리 완료');
  }
}

// 기존 webSpeechService와 동일한 인터페이스로 내보내기
export const whisperSpeechService = new WhisperSpeechService();