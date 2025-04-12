import { cn } from '@/lib/utils';
import type * as React from 'react';
import styles from './skeleton.module.css';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('relative overflow-hidden', className)} {...props}>
      <div className={styles.shimmer} />
    </div>
  );
}

export { Skeleton };
