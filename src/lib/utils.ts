import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));

export const formatTime = (seconds: number | null) => {
  if (seconds === null || Number.isNaN(seconds) || !Number.isFinite(seconds)) {
    return '00s';
  }
  const formattedSeconds = Math.max(0, Math.floor(seconds));
  return `${String(formattedSeconds).padStart(2, '0')}s`;
};
