import { type NextRequest, NextResponse } from 'next/server';
import { transcribe } from 'orate';
import { OpenAI } from 'orate/openai';

export function GET(_request: NextRequest) {
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

    const openai = new OpenAI();

    const transcription = await transcribe({
      model: openai.stt('whisper-1'),
      audio: audioFile,
    });
    return NextResponse.json({ text: transcription });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
