import React from 'react';
import SpeechToText from '@/components/SpeechToText';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Speech to Text Demo</h1>
      <SpeechToText />
    </main>
  );
} 