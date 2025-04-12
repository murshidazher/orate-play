'use client';

import { formatTime } from '@/lib/utils';
import { useEffect, useState } from 'react';
import AnimatedNumber from './animated-numbers';

export default function ReactCountDownWrapper({ value }: { value: number }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return '-';
  }

  return (
    <AnimatedNumber
      start={value}
      animateToNumber={value}
      duration={value}
      preserveValue
      formattingFn={(n: number) => formatTime(n)}
      locale="en-US"
    />
  );
}
