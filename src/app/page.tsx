import { PoweredBy } from '@/components/powered-by';
import SpeechToText from '@/components/speech-to-text';

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center">
      <SpeechToText />
      <PoweredBy />
    </main>
  );
}
