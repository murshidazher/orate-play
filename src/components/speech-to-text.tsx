'use client';

import { Spinner } from '@/components/ui/kibo-ui/spinner';
import {
  IconMicrophone,
  IconPlayerPlay,
  IconPlayerStop,
  IconSend,
  IconX,
} from '@tabler/icons-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

// Add type declaration for webkitAudioContext
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

type AudioVisualizerProps = {
  audioStream: MediaStream | null;
};

const AudioVisualizer = ({ audioStream }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!audioStream || !canvasRef.current) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextClass();
    const source = audioContext.createMediaStreamSource(audioStream);
    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;

    source.connect(analyser);
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
    });

    if (!canvasCtx) return;

    const draw = () => {
      if (!canvasRef.current || !canvasCtx) return;

      const WIDTH = canvasRef.current.width;
      const HEIGHT = canvasRef.current.height;

      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);
      canvasCtx.fillStyle = 'rgb(255, 241, 242)';
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

      const barWidth = (WIDTH / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * HEIGHT;

        canvasCtx.fillStyle = `rgb(244, 63, 94, ${barHeight / HEIGHT})`;
        canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      audioContext.close();
    };
  }, [audioStream]);

  return (
    <canvas ref={canvasRef} width={200} height={40} className="rounded-full" />
  );
};

export default function SpeechToText() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [error, setError] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setElapsedTime(0);
    setRemainingTime(0);
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [cleanup, audioUrl]);

  const formatTime = (seconds: number | null) => {
    if (seconds === null || isNaN(seconds) || !isFinite(seconds)) {
      return '00s';
    }
    return `${String(Math.max(0, Math.floor(seconds))).padStart(2, '0')}s`;
  };

  const startRecording = useCallback(async () => {
    try {
      cleanup();
      setError('');
      setAudioDuration(0);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      setAudioStream(stream);

      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm; codecs=opus',
      });

      let startTime = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: 'audio/webm; codecs=opus',
          });

          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
          }

          const url = URL.createObjectURL(audioBlob);
          setAudioUrl(url);

          // Create and load audio element
          const audio = new Audio();

          const loadAudio = new Promise<void>((resolve, reject) => {
            audio.addEventListener('loadedmetadata', () => {
              console.log('Audio metadata loaded, duration:', audio.duration);
              const duration = Math.ceil(audio.duration);
              if (duration === Number.POSITIVE_INFINITY || duration === 0) {
                // Fallback to recording time if duration is invalid
                const recordingDuration = Math.ceil(
                  (Date.now() - startTime) / 1000
                );
                console.log('Using recording time:', recordingDuration);
                setAudioDuration(recordingDuration);
                setRemainingTime(recordingDuration);
              } else {
                console.log('Using audio duration:', duration);
                setAudioDuration(duration);
                setRemainingTime(duration);
              }
              resolve();
            });

            audio.addEventListener('error', (e) => {
              console.error('Error loading audio:', e);
              reject(new Error('Failed to load audio'));
            });
          });

          audio.src = url;
          audio.onended = cleanup;
          audioRef.current = audio;

          try {
            await loadAudio;
          } catch (error) {
            console.error('Error loading audio:', error);
            // Fallback to recording time
            const recordingDuration = Math.ceil(
              (Date.now() - startTime) / 1000
            );
            console.log('Fallback to recording time:', recordingDuration);
            setAudioDuration(recordingDuration);
            setRemainingTime(recordingDuration);
          }
        } catch (error) {
          console.error('Error processing audio:', error);
          const recordingDuration = Math.ceil((Date.now() - startTime) / 1000);
          setAudioDuration(recordingDuration);
          setRemainingTime(recordingDuration);
        }
      };

      recorder.onstart = () => {
        startTime = Date.now();
        console.log('Recording started at:', startTime);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setIsExpanded(true);
    } catch (err) {
      console.error('Recording error:', err);
      setError(
        'Failed to access microphone. Please ensure you have granted microphone permissions.'
      );
    }
  }, [cleanup]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping recording...');
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      setIsRecording(false);
      setAudioStream(null);
    }
  }, [isRecording]);

  const handleSend = async () => {
    if (!audioUrl) return;

    try {
      setIsTranscribing(true);
      setError('');
      const audioBlob = await fetch(audioUrl).then((r) => r.blob());
      const audioFile = new File([audioBlob], 'recording.webm', {
        type: 'audio/webm',
      });

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
    } finally {
      setIsTranscribing(false);
    }
  };

  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !audioDuration) {
      console.log('Cannot play: audio not ready or no duration', {
        audio: !!audioRef.current,
        duration: audioDuration,
      });
      return;
    }

    if (isPlaying) {
      console.log('Stopping playback');
      cleanup();
    } else {
      console.log('Starting playback, duration:', audioDuration);
      audioRef.current.currentTime = 0;
      setRemainingTime(audioDuration);

      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);

          timerRef.current = setInterval(() => {
            if (audioRef.current) {
              const remaining = Math.max(
                0,
                audioDuration - audioRef.current.currentTime
              );
              console.log('Playback time remaining:', remaining);
              setRemainingTime(remaining);

              if (remaining <= 0) {
                console.log('Playback finished');
                cleanup();
              }
            }
          }, 100);
        })
        .catch((error) => {
          console.error('Error playing audio:', error);
          cleanup();
        });
    }
  }, [isPlaying, audioDuration, cleanup]);

  const handleCancel = () => {
    cleanup();
    if (isRecording) {
      stopRecording();
    }
    setIsExpanded(false);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setTranscribedText('');
    setError('');
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <AnimatePresence>
        <motion.div
          className="flex items-center gap-2 rounded-full bg-white shadow-lg"
          initial={{ width: 'auto' }}
          animate={{ width: isExpanded ? 'auto' : 'auto' }}
        >
          {isExpanded ? (
            <motion.div
              className="flex items-center gap-3 p-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.button
                className="rounded-full p-2 hover:bg-gray-100"
                onClick={handleCancel}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <IconX size={24} />
              </motion.button>

              {isRecording ? (
                <AudioVisualizer audioStream={audioStream} />
              ) : (
                <motion.button
                  className="flex min-w-[120px] items-center justify-center gap-2 px-4 py-2"
                  onClick={togglePlayback}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={!audioDuration}
                >
                  {isPlaying ? (
                    <>
                      <IconPlayerStop size={24} />
                      <span>{formatTime(remainingTime)}</span>
                    </>
                  ) : (
                    <>
                      <IconPlayerPlay size={24} />
                      <span>{formatTime(audioDuration)}</span>
                    </>
                  )}
                </motion.button>
              )}

              {isRecording ? (
                <motion.button
                  className="rounded-full bg-rose-500 p-2 text-white hover:bg-rose-600"
                  onClick={stopRecording}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <IconPlayerStop size={24} />
                </motion.button>
              ) : (
                <motion.button
                  className="rounded-full bg-rose-500 p-2 text-white hover:bg-rose-600"
                  onClick={handleSend}
                  disabled={isTranscribing}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isTranscribing ? (
                    <Spinner
                      variant="circle"
                      size={24}
                      className="text-white"
                    />
                  ) : (
                    <IconSend size={24} />
                  )}
                </motion.button>
              )}
            </motion.div>
          ) : (
            <motion.button
              className="rounded-full bg-rose-500 p-4 text-white transition-colors hover:bg-rose-600"
              onClick={startRecording}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <IconMicrophone size={24} />
            </motion.button>
          )}
        </motion.div>
      </AnimatePresence>

      {error && (
        <motion.p
          className="text-red-500 text-sm"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.p>
      )}

      {transcribedText && !isTranscribing && (
        <motion.div
          className="w-full max-w-md rounded-lg bg-gray-100 p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-gray-800">{transcribedText}</p>
        </motion.div>
      )}
    </div>
  );
}
