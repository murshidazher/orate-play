import { type Transition, motion, useAnimation, useInView } from 'motion/react';
import React from 'react';

// We'll generate the numbers array dynamically based on the current and target values
// instead of using a fixed array of all numbers

interface Props {
  className?: string;
  animateToNumber: number;
  start?: number;
  end?: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  fontStyle?: React.CSSProperties;
  transitions?: (index: number) => Transition;
  includeComma?: boolean;
  locale?: string;
  formattingFn?: (value: number) => string;
  preserveValue?: boolean;
  useEasing?: boolean;
}

const BaseAnimatedNumber = ({
  className,
  animateToNumber,
  duration = 2,
  decimals = 0,
  suffix = '',
  prefix = '',
  fontStyle,
  transitions,
  includeComma,
  locale,
  formattingFn,
  preserveValue = false,
  useEasing = true,
}: Props) => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });

  const controls = useAnimation();
  const [displayValue, setDisplayValue] = React.useState(animateToNumber);
  const prevValueRef = React.useRef(animateToNumber);
  const isFirstRender = React.useRef(true);
  const animationFrameRef = React.useRef<number | null>(null);

  // Format the number based on the formatting function or default formatting
  const formatNumber = (num: number) => {
    if (formattingFn) {
      return formattingFn(num);
    }

    const formattedNumber = includeComma
      ? Math.abs(num).toLocaleString(locale || 'en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : Math.abs(num).toFixed(decimals);

    return formattedNumber;
  };

  // Format the current display value
  const currentFormattedValue = formatNumber(displayValue);
  const animateTonumberString = formatNumber(animateToNumber);

  // Convert the formatted strings to arrays of characters
  const currentValueArr = Array.from(currentFormattedValue, (char) => {
    const num = Number(char);
    return Number.isNaN(num) ? char : num;
  });

  const animateToNumbersArr = Array.from(animateTonumberString, (char) => {
    const num = Number(char);
    return Number.isNaN(num) ? char : num;
  });

  const [numberHeight, setNumberHeight] = React.useState(0);
  const [numberWidth, setNumberWidth] = React.useState(0);

  const numberDivRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const rect = numberDivRef.current?.getClientRects()?.[0];
    if (rect) {
      setNumberHeight(rect.height);
      setNumberWidth(rect.width);
    }
  }, []);

  // Clean up animation frame on unmount
  React.useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (isInView) {
      controls.start('visible');

      if (isFirstRender.current) {
        setDisplayValue(animateToNumber);
        prevValueRef.current = animateToNumber;
        isFirstRender.current = false;
        return;
      }

      if (prevValueRef.current === animateToNumber) {
        return;
      }

      const previousValue = prevValueRef.current;
      prevValueRef.current = animateToNumber;

      const startTime = Date.now();
      const endTime = startTime + duration * 1000;

      const animate = () => {
        const now = Date.now();
        const progress = Math.min(1, (now - startTime) / (duration * 1000));

        // Enhanced easing function for smoother animation with more pronounced ease on upward motion
        let easedProgress = progress;

        if (useEasing) {
          if (progress < 0.7) {
            // slower initial motion
            easedProgress = 0.8 * (1 - (1 - progress / 0.7) ** 4);
          } else {
            // faster end with stronger spring
            easedProgress =
              0.8 +
              (progress - 0.7) * (0.2 / 0.3) +
              Math.sin(progress * Math.PI) * 0.15;
          }
        }

        const newValue =
          previousValue + (animateToNumber - previousValue) * easedProgress;
        setDisplayValue(newValue);

        if (now < endTime) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setDisplayValue(animateToNumber);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [isInView, animateToNumber, controls, duration, useEasing]);

  // Determine which array to use for rendering
  const renderArray = preserveValue ? currentValueArr : animateToNumbersArr;

  // Generate numbers array dynamically based on the current and target values
  const generateNumbersArray = (currentDigit: number, targetDigit: number) => {
    // If current and target are the same, just return the current digit
    if (currentDigit === targetDigit) {
      return [currentDigit];
    }

    // Determine the direction of animation
    const isReverse = currentDigit > targetDigit;

    // Create an array with only the necessary numbers for the animation
    const numbers: number[] = [];

    if (isReverse) {
      // For reverse animation (top to down)
      for (let i = currentDigit; i >= targetDigit; i--) {
        numbers.push(i);
      }
    } else {
      // For forward animation (bottom to up)
      for (let i = currentDigit; i <= targetDigit; i++) {
        numbers.push(i);
      }
    }

    return numbers;
  };

  return (
    <span ref={ref}>
      {prefix}
      {numberHeight !== 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            overflow: 'hidden',
            alignItems: 'center',
            position: 'relative',
          }}
          className={className}
        >
          {renderArray.map((n, index) => {
            if (typeof n === 'string') {
              return (
                <div
                  key={index}
                  style={{
                    ...fontStyle,
                    fontVariantNumeric: 'tabular-nums',
                    display: 'flex',
                    alignItems: 'center',
                    height: numberHeight,
                  }}
                >
                  {n}
                </div>
              );
            }

            // Get the current digit from the current value array
            const currentDigit =
              typeof currentValueArr[index] === 'number'
                ? (currentValueArr[index] as number)
                : 0;

            // Get the target digit from the target value array
            const targetDigit =
              typeof animateToNumbersArr[index] === 'number'
                ? (animateToNumbersArr[index] as number)
                : 0;

            // Generate the numbers array for this digit position
            const numbersForDigit = generateNumbersArray(
              currentDigit,
              targetDigit
            );

            // Calculate the animation distance based on the number of steps
            const animationDistance =
              numberHeight * (numbersForDigit.length - 1);

            return (
              <motion.div
                key={`${n}_${index}`}
                style={{
                  height: numberHeight,
                  width: numberWidth,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
                initial="hidden"
                variants={{
                  hidden: { y: 0 },
                  visible: {
                    y: -animationDistance,
                  },
                }}
                animate={controls}
                transition={
                  transitions?.(index) || {
                    type: 'spring',
                    damping: 12, // reduced damping for more bounce
                    stiffness: 100, // reduced stiffness for more spring effect
                    mass: 0.8, // increased mass for more momentum
                    restDelta: 0.001, // smaller rest delta for smoother finish
                    duration: duration,
                    bounce: 0.4, // add bounce for more springiness
                  }
                }
              >
                {numbersForDigit.map((number, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...fontStyle,
                      fontVariantNumeric: 'tabular-nums',
                      height: numberHeight,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {number}
                  </div>
                ))}
              </motion.div>
            );
          })}
        </div>
      )}
      <span style={{ ...fontStyle }}>{suffix}</span>

      <div
        ref={numberDivRef}
        style={{ position: 'absolute', top: -9999, ...fontStyle }}
      >
        {0}
      </div>
    </span>
  );
};

const AnimatedNumber = React.memo(
  BaseAnimatedNumber,
  (prevProps, nextProps) => {
    return (
      prevProps.animateToNumber === nextProps.animateToNumber &&
      prevProps.fontStyle === nextProps.fontStyle &&
      prevProps.includeComma === nextProps.includeComma &&
      prevProps.start === nextProps.start &&
      prevProps.end === nextProps.end &&
      prevProps.duration === nextProps.duration &&
      prevProps.decimals === nextProps.decimals &&
      prevProps.suffix === nextProps.suffix &&
      prevProps.prefix === nextProps.prefix &&
      prevProps.preserveValue === nextProps.preserveValue
    );
  }
);

export default AnimatedNumber;
