import SpeechToText from '@/components/speech-to-text';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="mb-8 font-bold text-4xl">Speech to Text Demo</h1>
      <SpeechToText />
    </main>
  );
}
