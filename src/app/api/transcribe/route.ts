import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';
import { transcribe } from 'orate';
import { OpenAI } from 'orate/openai';

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Hello, world!' });
}
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    console.log(env.OPENAI_API_KEY);

    const openai = new OpenAI();

    const transcription = await transcribe({
      model: openai.stt('whisper-1'),
      audio: audioFile,
    });

    console.log(transcription);

    return NextResponse.json({ text: transcription });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
} 