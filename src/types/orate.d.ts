declare module 'orate' {
  export interface TranscribeOptions {
    model: any;
    audio: File;
  }

  export function transcribe(options: TranscribeOptions): Promise<string>;
}

declare module 'orate/openai' {
  interface OpenAIOptions {
    apiKey?: string;
  }

  export class OpenAI {
    constructor(options?: OpenAIOptions);
    stt(model?: string): {
      generate: (audio: File) => Promise<string>;
      stream: (audio: File) => Promise<ReadableStream>;
    };
  }
} 