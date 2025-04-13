'use client';

import {
  Cursor,
  CursorBody,
  CursorMessage,
  CursorName,
  CursorPointer,
} from '@/components/ui/kibo-ui/cursor';
import { Spinner } from '@/components/ui/kibo-ui/spinner';
import { toast } from '@/components/ui/sonner';
import { cn, formatTime } from '@/lib/utils';
import {
  IconBrandTelegram,
  IconCheck,
  IconCircleCheck,
  IconCircleX,
  IconMicrophoneFilled,
  IconPlayerPlayFilled,
  IconPlayerStopFilled,
  IconX,
} from '@tabler/icons-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import ReactCountDownWrapper from './ui/react-count-down-wrapper';
import { Skeleton } from './ui/skeleton';

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

const PlaybackButton = ({
  isPlaying,
  audioDuration,
  remainingTime,
  togglePlayback,
}: {
  isPlaying: boolean;
  audioDuration: number;
  remainingTime: number;
  togglePlayback: () => void;
}) => (
  <motion.button
    className="flex cursor-pointer items-center gap-1.5"
    onClick={togglePlayback}
    disabled={!audioDuration}
  >
    {isPlaying ? (
      <>
        <IconPlayerStopFilled className="h-3.5 w-3.5 text-rose-500" />
        <span className="font-medium text-[13px] text-rose-500 tabular-nums">
          <ReactCountDownWrapper value={remainingTime} />
        </span>
      </>
    ) : (
      <>
        <IconPlayerPlayFilled size={14} className="text-gray-700" />
        <span className="font-medium text-[13px] text-gray-700 tabular-nums">
          {formatTime(audioDuration)}
        </span>
      </>
    )}
  </motion.button>
);

type ActionButtonContent = ReactElement | null;

const ActionButton = ({
  isTranscribing,
  isRecording,
  isCanceling,
  handleSend,
  stopRecording,
}: {
  isTranscribing: boolean;
  isRecording: boolean;
  isCanceling: boolean;
  handleSend: () => void;
  stopRecording: () => void;
}) => {
  const renderSpinner = () => (
    <motion.div
      key="spinner"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
        mass: 1.2,
        duration: 0.6,
      }}
    >
      <Spinner variant="circle" size={16} className="text-gray-900" />
    </motion.div>
  );

  const renderCheck = () => (
    <motion.div key="check">
      <IconCheck size={16} className="text-gray-900" />
    </motion.div>
  );

  const renderSend = () => (
    <motion.div
      key="send"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
        mass: 1.2,
        delay: 0.4,
        duration: 0.6,
      }}
    >
      <IconBrandTelegram size={16} className="text-gray-900" />
    </motion.div>
  );

  let content: ActionButtonContent = null;

  if (isTranscribing) {
    content = renderSpinner();
  } else if (isRecording || isCanceling) {
    content = renderCheck();
  } else if (!isCanceling) {
    content = renderSend();
  }

  return (
    <motion.button
      className="cursor-pointer rounded-full border border-gray-200 bg-white p-2 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] transition-colors hover:bg-gray-50"
      onClick={isRecording ? stopRecording : handleSend}
      disabled={isTranscribing || isCanceling}
      initial={{ x: -20, y: 0, opacity: 0 }}
      animate={{
        x: isCanceling ? -20 : 0,
        y: 0,
        opacity: isCanceling ? 0 : 1,
        scale: isCanceling ? 0.8 : 1,
      }}
      exit={{ x: -20, y: 0, opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
        mass: 1.2,
        delay: 0.4,
        duration: 0.6,
      }}
    >
      <AnimatePresence mode="wait">{content}</AnimatePresence>
    </motion.button>
  );
};

const TranscribedText = ({
  transcribedText,
  isTranscribing,
}: {
  transcribedText: string;
  isTranscribing: boolean;
}) => {
  if (!transcribedText || isTranscribing) {
    return null;
  }

  return (
    <motion.div
      className="-translate-x-1/2 absolute top-20 left-1/2 w-full max-w-md"
      initial={{ opacity: 0, y: 40, scale: 1 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 15,
        mass: 0.8,
        duration: 0.8,
      }}
    >
      <Cursor>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 15,
            mass: 0.8,
            delay: 0.1,
          }}
        >
          <CursorPointer className="text-sky-500" />
        </motion.div>
        <motion.div
          initial={{ scale: 0.5, opacity: 0, x: -20 }}
          animate={{ scale: 1, opacity: 1, x: 0 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 15,
            mass: 0.8,
            delay: 0.2,
          }}
        >
          <CursorBody className="w-fit bg-sky-100 text-sky-700">
            <CursorName>@OpenAI</CursorName>
            <CursorMessage>{transcribedText}</CursorMessage>
          </CursorBody>
        </motion.div>
      </Cursor>
    </motion.div>
  );
};

const RecordingVisualizer = ({
  isRecording,
  isCanceling,
  audioStream,
  audioDuration,
  recordingProgress,
}: {
  isRecording: boolean;
  isCanceling: boolean;
  audioStream: MediaStream | null;
  audioDuration: number;
  recordingProgress: number;
}) => {
  if ((!isRecording && !isCanceling) || audioDuration) {
    return null;
  }

  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="absolute h-[36px] w-[60px] rounded-[18px]"
          style={{
            background: 'transparent',
          }}
        >
          <svg
            className="absolute inset-0 h-full w-full"
            aria-label="Recording progress indicator"
            role="img"
          >
            <title>Recording progress indicator</title>
            <path
              d="M57.5 18 C57.5 26 52 33.5 42.5 33.5 H17.5 C8 33.5 2.5 26 2.5 18 C2.5 10 8 2.5 17.5 2.5 H42.5 C52 2.5 57.5 10 57.5 18"
              fill="none"
              stroke="#F43F5E"
              strokeWidth="2.5"
              strokeDasharray={`${(recordingProgress / 100) * 140} 140`}
              strokeLinecap="round"
              style={{
                opacity: 1,
                transformOrigin: 'center',
                transform: 'rotate(0deg)',
                strokeDashoffset: -7,
              }}
            />
          </svg>
        </div>
      </div>
      <Skeleton className="absolute inset-0 z-0 rounded-[18px] bg-rose-200/20" />
      <div className="relative z-20">
        <AudioVisualizer audioStream={audioStream} />
      </div>
    </>
  );
};

// Split SpeechToText into smaller components to reduce cognitive complexity
const ExpandedControls = ({
  isCanceling,
  isRecording,
  isTranscribing,
  audioStream,
  isPlaying,
  audioDuration,
  remainingTime,
  togglePlayback,
  handleCancel,
  handleSend,
  stopRecording,
  recordingProgress,
}: {
  isCanceling: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  audioStream: MediaStream | null;
  isPlaying: boolean;
  audioDuration: number;
  remainingTime: number;
  togglePlayback: () => void;
  handleCancel: () => void;
  handleSend: () => void;
  stopRecording: () => void;
  recordingProgress: number;
}) => (
  <motion.div
    key="expanded"
    className="absolute flex items-center gap-2 rounded-[22px] transition-all duration-300 ease-in-out"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{
      opacity: isCanceling ? 0 : 1,
      scale: isCanceling ? 0.9 : 1,
    }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{
      type: 'spring',
      stiffness: 500,
      damping: 30,
      mass: 0.5,
      duration: 0.2,
    }}
  >
    <motion.div className="flex items-center gap-2 p-[6px]">
      <motion.button
        className="cursor-pointer rounded-full border border-gray-200 bg-white p-2 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] transition-colors hover:bg-gray-50"
        onClick={handleCancel}
        initial={{ x: 20, y: 0, opacity: 0 }}
        animate={{
          x: isCanceling ? 20 : 0,
          y: 0,
          opacity: isCanceling ? 0 : 1,
          scale: isCanceling ? 0.8 : 1,
        }}
        exit={{ x: 20, y: 0, opacity: 0 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 20,
          mass: 1.2,
          delay: 0.4,
          duration: 0.6,
        }}
      >
        <IconX size={16} className="text-gray-600" />
      </motion.button>

      <div className="relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
            mass: 0.5,
            delay: 0.1,
            duration: 0.2,
          }}
          className={cn(
            'relative flex h-[36px] w-[60px] items-center justify-center rounded-[18px] bg-white py-[6px] shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]',
            !isRecording && !isCanceling && 'border border-gray-200',
            (isRecording || isCanceling) &&
              !audioDuration && [
                'bg-rose-200/10',
                'before:absolute before:inset-0 before:z-10 before:rounded-[18px] before:border-rose-100/50 before:shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]',
              ]
          )}
        >
          <RecordingVisualizer
            isRecording={isRecording}
            isCanceling={isCanceling}
            audioStream={audioStream}
            audioDuration={audioDuration}
            recordingProgress={recordingProgress}
          />
          {!isRecording && !isCanceling && (
            <PlaybackButton
              isPlaying={isPlaying}
              audioDuration={audioDuration}
              remainingTime={remainingTime}
              togglePlayback={togglePlayback}
            />
          )}
        </motion.div>
      </div>

      <ActionButton
        isTranscribing={isTranscribing}
        isRecording={isRecording}
        isCanceling={isCanceling}
        handleSend={handleSend}
        stopRecording={stopRecording}
      />
    </motion.div>
  </motion.div>
);

const CollapsedButton = ({
  startRecording,
}: {
  startRecording: () => void;
}) => (
  <motion.div
    key="collapsed"
    className="absolute flex items-center"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{
      type: 'spring',
      stiffness: 500,
      damping: 30,
      mass: 0.5,
      duration: 0.2,
    }}
  >
    <motion.button
      className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white p-2 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] transition-colors hover:bg-gray-50"
      onClick={startRecording}
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0.9 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
        mass: 0.5,
        duration: 0.2,
      }}
    >
      <IconMicrophoneFilled size={18} className="text-gray-900" />
    </motion.button>
  </motion.div>
);

export default function SpeechToText() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [_isFullyCollapsed, setIsFullyCollapsed] = useState(true);
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

  const startRecording = useCallback(async () => {
    try {
      cleanup();
      setError('');
      setAudioDuration(0);
      audioChunksRef.current = [];
      setIsFullyCollapsed(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      setAudioStream(stream);
      toast.success('Recording started', {
        icon: <IconCircleCheck className="text-green-700" size={18} />,
      });

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
      const errorMessage = 'Failed to access microphone';
      setError(errorMessage);
      toast.error(errorMessage, {
        icon: <IconCircleX className="text-red-600" size={18} />,
      });
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
      toast.success('Recording saved', {
        icon: <IconCircleCheck className="text-emerald-700" size={18} />,
      });
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
      toast.success('Transcription complete', {
        icon: <IconCircleCheck className="text-emerald-700" size={18} />,
      });
    } catch (_err) {
      const errorMessage = 'Failed to transcribe';
      setError(errorMessage);
      toast.error(errorMessage, {
        icon: <IconCircleX className="text-red-700" size={18} />,
      });
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
    setIsCanceling(true);

    if (isRecording) {
      stopRecording();
      toast('Recording dismissed', {
        icon: <IconCircleX className="text-gray-500" size={18} />,
      });
    }

    // Adjust timing for smoother transition
    setTimeout(() => {
      setIsExpanded(false);
      setIsCanceling(false);
      setIsFullyCollapsed(true);
    }, 200); // Reduced for faster transition

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setTranscribedText('');
    setError('');
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
    <div className="relative flex min-h-[200px] flex-col items-center">
      <div className="-translate-x-1/2 absolute top-4 left-1/2">
        <div className="relative flex h-[36px] justify-center">
          <AnimatePresence mode="wait" initial={false}>
            {isExpanded || isCanceling ? (
              <ExpandedControls
                isCanceling={isCanceling}
                isRecording={isRecording}
                isTranscribing={isTranscribing}
                audioStream={audioStream}
                isPlaying={isPlaying}
                audioDuration={audioDuration}
                remainingTime={remainingTime}
                togglePlayback={togglePlayback}
                handleCancel={handleCancel}
                handleSend={handleSend}
                stopRecording={stopRecording}
                recordingProgress={recordingProgress}
              />
            ) : (
              <CollapsedButton startRecording={startRecording} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {error && (
        <motion.div
          className="-translate-x-1/2 absolute top-16 left-1/2 text-red-500 text-sm"
          initial={{ opacity: 0, y: -10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 20,
            mass: 1.2,
            duration: 0.6,
          }}
        >
          {error}
        </motion.div>
      )}

      <TranscribedText
        transcribedText={transcribedText}
        isTranscribing={isTranscribing}
      />
    </div>
  );
}
