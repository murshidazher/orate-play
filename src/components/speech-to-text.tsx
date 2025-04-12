'use client';

import { Spinner } from '@/components/ui/kibo-ui/spinner';
import {
  IconCheck,
  IconMicrophoneFilled,
  IconPlayerPlayFilled,
  IconPlayerStopFilled,
  IconSend,
  IconX,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import CountUp from 'react-countup';

// Add type declaration for webkitAudioContext
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

type AudioVisualizerProps = {
  audioStream: MediaStream | null;
};

// Helper functions moved outside component
const drawRoundedBar = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
};

const MAX_RECORDING_TIME = 60; // 1 minute in seconds

const calculateVisualizerBarHeight = (
  dataArray: Uint8Array,
  startIndex: number,
  endIndex: number,
  bufferLength: number
): number => {
  let sum = 0;
  let count = 0;
  for (let j = startIndex; j < endIndex && j < bufferLength; j++) {
    sum += dataArray[j];
    count++;
  }
  const average = count > 0 ? sum / count : 0;
  return Math.max((average / 255) * 16, 6); // Adjusted for crisper bars
};

const AudioVisualizer = ({ audioStream }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!audioStream || !canvasRef.current) {
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextClass();
    const source = audioContext.createMediaStreamSource(audioStream);
    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;

    source.connect(analyser);
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.7;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');

    if (!canvasCtx) {
      return;
    }

    const frequencyRanges = [
      { start: 0, end: 150 },
      { start: 150, end: 400 },
      { start: 400, end: 1000 },
      { start: 1000, end: 4000 },
      { start: 4000, end: 8000 },
    ];

    const draw = () => {
      if (!canvasRef.current || !canvasCtx) {
        return;
      }

      const WIDTH = canvasRef.current.width;
      const HEIGHT = canvasRef.current.height;

      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

      const barWidth = 2.5; // Adjusted for crisp bars
      const spacing = 3; // Adjusted spacing
      const totalWidth = barWidth * 5 + spacing * 4;
      const startX = (WIDTH - totalWidth) / 2;

      for (let i = 0; i < 5; i++) {
        const range = frequencyRanges[i];
        const startIndex = Math.floor(
          (range.start / (audioContext.sampleRate / 2)) * bufferLength
        );
        const endIndex = Math.floor(
          (range.end / (audioContext.sampleRate / 2)) * bufferLength
        );

        const barHeight = calculateVisualizerBarHeight(
          dataArray,
          startIndex,
          endIndex,
          bufferLength
        );

        canvasCtx.fillStyle = '#F43F5E';
        drawRoundedBar(
          canvasCtx,
          startX + i * (barWidth + spacing),
          (HEIGHT - barHeight) / 2,
          barWidth,
          barHeight,
          barWidth / 2
        );
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

  return <canvas ref={canvasRef} width={80} height={24} className="px-2" />; // Adjusted canvas size
};

const _SimpleAudioVisualizer = () => {
  return (
    <div className="flex items-center justify-center gap-[2px] px-2">
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="h-3 w-[1.5px] bg-rose-500"
          initial={{ height: 6 }}
          animate={{
            height: [6, 12, 6],
            transition: {
              duration: 0.4,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 0.1,
              ease: 'easeInOut',
            },
          }}
        />
      ))}
    </div>
  );
};

export default function SpeechToText() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [error, setError] = useState('');
  const [_elapsedTime, setElapsedTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [recordingProgress, setRecordingProgress] = useState(0);

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
    if (
      seconds === null ||
      Number.isNaN(seconds) ||
      !Number.isFinite(seconds)
    ) {
      return '00s';
    }
    const formattedSeconds = Math.max(0, Math.floor(seconds));
    return `${String(formattedSeconds).padStart(2, '0')}s`;
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
              const duration = Math.ceil(audio.duration);
              if (duration === Number.POSITIVE_INFINITY || duration === 0) {
                // Fallback to recording time if duration is invalid
                const recordingDuration = Math.ceil(
                  (Date.now() - startTime) / 1000
                );
                setAudioDuration(recordingDuration);
                setRemainingTime(recordingDuration);
              } else {
                setAudioDuration(duration);
                setRemainingTime(duration);
              }
              resolve();
            });

            audio.addEventListener('error', (_e) => {
              reject(new Error('Failed to load audio'));
            });
          });

          audio.src = url;
          audio.onended = cleanup;
          audioRef.current = audio;

          try {
            await loadAudio;
          } catch (_error) {
            // Fallback to recording time
            const recordingDuration = Math.ceil(
              (Date.now() - startTime) / 1000
            );
            setAudioDuration(recordingDuration);
            setRemainingTime(recordingDuration);
          }
        } catch (_error) {
          const recordingDuration = Math.ceil((Date.now() - startTime) / 1000);
          setAudioDuration(recordingDuration);
          setRemainingTime(recordingDuration);
        }
      };

      recorder.onstart = () => {
        startTime = Date.now();
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setIsExpanded(true);
    } catch (_err) {
      setError(
        'Failed to access microphone. Please ensure you have granted microphone permissions.'
      );
    }
  }, [cleanup, audioUrl]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      for (const track of mediaRecorderRef.current.stream.getTracks()) {
        track.stop();
      }
      setIsRecording(false);
      setAudioStream(null);
      setRecordingProgress(0);
    }
  }, [isRecording]);

  const handleSend = async () => {
    if (!audioUrl) {
      return;
    }

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
    } catch (_err) {
      setError('Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !audioDuration) {
      return;
    }

    if (isPlaying) {
      cleanup();
    } else {
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
              setRemainingTime(remaining);

              if (remaining <= 0) {
                cleanup();
              }
            }
          }, 100);
        })
        .catch((_error) => {
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

  const renderButtonIcon = () => {
    if (isTranscribing) {
      return <Spinner variant="circle" size={16} className="text-gray-900" />;
    }
    if (isRecording) {
      return <IconCheck size={16} className="text-gray-900" />;
    }
    return <IconSend size={16} className="text-gray-900" />;
  };

  // Add recording time limit logic
  useEffect(() => {
    if (isRecording) {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = (elapsed / MAX_RECORDING_TIME) * 100;

        if (elapsed >= MAX_RECORDING_TIME) {
          stopRecording();
          clearInterval(interval);
        } else {
          setRecordingProgress(progress);
        }
      }, 100);

      return () => {
        clearInterval(interval);
        setRecordingProgress(0);
      };
    }
  }, [isRecording, stopRecording]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="relative h-[36px]">
        <motion.div
          className={`flex items-center gap-2 rounded-[22px] transition-all duration-300 ease-in-out ${
            isExpanded ? 'min-w-[240px]' : ''
          }`}
          initial={false}
          animate={{
            width: isExpanded ? 'auto' : 'auto',
          }}
        >
          {isExpanded ? (
            <motion.div
              className="flex items-center gap-2 p-[6px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <motion.button
                className="cursor-pointer rounded-full bg-white p-2 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] transition-colors hover:bg-gray-50"
                onClick={handleCancel}
              >
                <IconX size={16} className="text-gray-600" />
              </motion.button>

              <div className="relative">
                {/* Border animation container */}
                {isRecording && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="absolute h-[36px] w-[60px] rounded-[18px]"
                      style={{
                        background: 'transparent',
                      }}
                    >
                      <div
                        className="absolute inset-0"
                        style={{
                          WebkitMask: `conic-gradient(from 90deg at 50% 50%, black ${recordingProgress}%, transparent ${recordingProgress}%)`,
                          mask: `conic-gradient(from 90deg at 50% 50%, black ${recordingProgress}%, transparent ${recordingProgress}%)`,
                          border: '2.5px solid #F43F5E',
                          borderRadius: '18px',
                          opacity: 0.5,
                        }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex h-[36px] w-[60px] items-center justify-center rounded-[18px] bg-white py-[6px] shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
                  {isRecording ? (
                    <AudioVisualizer audioStream={audioStream} />
                  ) : (
                    <motion.button
                      className="flex cursor-pointer items-center gap-1.5"
                      onClick={togglePlayback}
                      disabled={!audioDuration}
                    >
                      {isPlaying ? (
                        <>
                          <IconPlayerStopFilled className="h-3.5 w-3.5 text-rose-500" />
                          <span className="font-medium text-[13px] text-rose-500 tabular-nums">
                            <CountUp
                              start={remainingTime}
                              end={0}
                              duration={remainingTime}
                              preserveValue
                              decimals={0}
                              useEasing={false}
                              suffix="s"
                              formattingFn={(n: number) => formatTime(n)}
                            />
                          </span>
                        </>
                      ) : (
                        <>
                          <IconPlayerPlayFilled
                            size={14}
                            className="text-gray-700"
                          />
                          <span className="font-medium text-[13px] text-gray-700 tabular-nums">
                            {formatTime(audioDuration)}
                          </span>
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
              </div>

              <motion.button
                className="cursor-pointer rounded-full bg-white p-2 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] transition-colors hover:bg-gray-50"
                onClick={isRecording ? stopRecording : handleSend}
                disabled={isTranscribing}
              >
                {renderButtonIcon()}
              </motion.button>
            </motion.div>
          ) : (
            <motion.button
              className="cursor-pointer rounded-full bg-white p-3 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] transition-colors hover:bg-gray-50"
              onClick={startRecording}
            >
              <IconMicrophoneFilled size={18} className="text-gray-900" />
            </motion.button>
          )}
        </motion.div>
      </div>

      {error && (
        <motion.div
          className="text-red-500 text-sm"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {error}
        </motion.div>
      )}

      {transcribedText && !isTranscribing && (
        <motion.div
          className="w-full max-w-md rounded-lg bg-gray-100 p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <p className="text-gray-800">{transcribedText}</p>
        </motion.div>
      )}
    </div>
  );
}
