'use client';

import React, { useState, useCallback } from 'react';
import { IconMicrophone } from '@tabler/icons-react';

export default function SpeechToText() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [error, setError] = useState('');

  const handleRecording = useCallback(async () => {
    if (!isRecording) {
      try {
        setIsRecording(true);
        setError('');
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm'
        });
        const audioChunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });

          try {
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
          } catch (err) {
            setError('Failed to transcribe audio. Please try again.');
            console.error('Transcription error:', err);
          }
        };

        mediaRecorder.start();
        setTimeout(() => {
          mediaRecorder.stop();
          stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
        }, 5000); // Record for 5 seconds
      } catch (err) {
        setError('Failed to access microphone. Please ensure you have granted microphone permissions.');
        setIsRecording(false);
        console.error('Microphone error:', err);
      }
    }
  }, [isRecording]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <button
        onClick={handleRecording}
        disabled={isRecording}
        className={`p-4 rounded-full ${
          isRecording 
            ? 'bg-red-500 animate-pulse' 
            : 'bg-blue-500 hover:bg-blue-600'
        } transition-colors duration-200`}
      >
        <IconMicrophone 
          size={24} 
          className="text-white"
        />
      </button>
      
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
      
      {transcribedText && (
        <div className="w-full max-w-md p-4 bg-gray-100 rounded-lg">
          <p className="text-gray-800">{transcribedText}</p>
        </div>
      )}
    </div>
  );
} 