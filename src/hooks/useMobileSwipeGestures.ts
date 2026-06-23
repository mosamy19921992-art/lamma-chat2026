import { useEffect, useRef, useState } from "react";

interface SwipeGesturesOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  disabled?: boolean;
}

export function useMobileSwipeGestures(options: SwipeGesturesOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    threshold = 50,
    disabled = false,
  } = options;

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (disabled || !elementRef.current) return;

    const element = elementRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      setIsDragging(true);
      setStartX(e.touches[0].clientX);
      setCurrentX(e.touches[0].clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      setCurrentX(e.touches[0].clientX);
    };

    const handleTouchEnd = () => {
      if (!isDragging) return;
      const deltaX = currentX - startX;

      if (deltaX > threshold && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < -threshold && onSwipeLeft) {
        onSwipeLeft();
      }

      setIsDragging(false);
      setStartX(0);
      setCurrentX(0);
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [disabled, isDragging, startX, currentX, threshold, onSwipeLeft, onSwipeRight]);

  return {
    elementRef,
    isDragging,
    deltaX: currentX - startX,
  };
}

export function useSpringPhysics(initialValue: number = 0, stiffness: number = 300, damping: number = 25) {
  const [value, setValue] = useState(initialValue);
  const [velocity, setVelocity] = useState(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    let targetValue = initialValue;
    let currentValue = initialValue;
    let currentVelocity = 0;

    const animate = () => {
      const displacement = targetValue - currentValue;
      const springForce = stiffness * displacement;
      const dampingForce = damping * currentVelocity;
      const acceleration = springForce - dampingForce;

      currentVelocity += acceleration / 60;
      currentValue += currentVelocity / 60;

      if (Math.abs(displacement) < 0.1 && Math.abs(currentVelocity) < 0.1) {
        currentValue = targetValue;
        currentVelocity = 0;
        setValue(currentValue);
        setVelocity(currentVelocity);
        return;
      }

      setValue(currentValue);
      setVelocity(currentVelocity);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initialValue, stiffness, damping]);

  const setTarget = (target: number) => {
    target = target;
  };

  return { value, setTarget };
}
