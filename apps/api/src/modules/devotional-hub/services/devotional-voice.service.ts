import { BadRequestException, Injectable, Logger } from '@nestjs/common';

/**
 * Voice-to-text wrapper — integrate Whisper / cloud STT in Phase 2.
 */
@Injectable()
export class DevotionalVoiceService {
  private readonly logger = new Logger(DevotionalVoiceService.name);

  validateTranscript(text: string) {
    if (!text?.trim()) {
      throw new BadRequestException('Transcript text is required');
    }
    return text.trim();
  }

  async transcribe(_audioUrl: string): Promise<string> {
    this.logger.warn('Voice transcription stub — configure STT provider');
    return 'Transcription will appear when voice service is configured.';
  }
}
