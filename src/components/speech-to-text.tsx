'use client';

import { Spinner } from '@/components/ui/kibo-ui/spinner';
import { IconMicrophone } from '@tabler/icons-react';
import { useCallback, useState } from 'react';

export default function SpeechToText() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [error, setError] = useState('');

  const handleRecording = useCallback(async () => {
    if (!isRecording) {
      try {
        setIsRecording(true);
        setError('');

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm',
        });
        const audioChunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], 'recording.webm', {
            type: 'audio/webm',
          });

          try {
            setIsTranscribing(true);
            const formData = new FormData();
            formData.append('audio', audioFile);

            const response = await fetch('/api/transcribe', {
              method: 'POST',
              body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to transcribe audio');
            }

            setTranscribedText(data.text);
          } catch (_err) {
            setError('Failed to transcribe audio. Please try again.');
          } finally {
            setIsTranscribing(false);
          }
        };

        mediaRecorder.start();
        setTimeout(() => {
          mediaRecorder.stop();
          stream.getTracks().forEach((track) => track.stop());
          setIsRecording(false);
        }, 5000); // Record for 5 seconds
      } catch (_err) {
        setError(
          'Failed to access microphone. Please ensure you have granted microphone permissions.'
        );
        setIsRecording(false);
      }
    }
  }, [isRecording]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <button
        onClick={handleRecording}
        disabled={isRecording || isTranscribing}
        className={`rounded-full p-4 ${
          isRecording
            ? 'animate-pulse bg-red-500'
            : isTranscribing
              ? 'bg-gray-400'
              : 'bg-blue-500 hover:bg-blue-600'
        } transition-colors duration-200`}
      >
        {isTranscribing ? (
          <Spinner variant="circle" size={24} className="text-white" />
        ) : (
          <IconMicrophone size={24} className="text-white" />
        )}
      </button>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {isTranscribing && (
        <div className="flex items-center gap-2">
          <Spinner variant="circle" size={20} />
          <p className="text-gray-600">Transcribing audio...</p>
        </div>
      )}

      {transcribedText && !isTranscribing && (
        <div className="w-full max-w-md rounded-lg bg-gray-100 p-4">
          <p className="text-gray-800">{transcribedText}</p>
        </div>
      )}
    </div>
  );
}
