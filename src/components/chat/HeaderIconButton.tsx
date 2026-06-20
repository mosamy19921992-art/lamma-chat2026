import React, { useState, useRef } from "react";

export function HeaderIconButton({
  title,
  onClick,
  className,
  children,
}: {
  title: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [isTipOpen, setIsTipOpen] = useState(false);
  const pressTimerRef = useRef<number | null>(null);

  const clearPressTimer = () => {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={title}
        title={title}
        onClick={onClick}
        onMouseEnter={() => setIsTipOpen(true)}
        onMouseLeave={() => setIsTipOpen(false)}
        onFocus={() => setIsTipOpen(true)}
        onBlur={() => setIsTipOpen(false)}
        onPointerDown={() => {
          clearPressTimer();
          pressTimerRef.current = window.setTimeout(() => {
            setIsTipOpen(true);
          }, 420);
        }}
        onPointerUp={() => {
          clearPressTimer();
          window.setTimeout(() => setIsTipOpen(false), 250);
        }}
        onPointerCancel={() => {
          clearPressTimer();
          setIsTipOpen(false);
        }}
        className={className}
      >
        {children}
      </button>
      {isTipOpen && (
        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[200] rounded-xl border border-white/10 bg-black/80 px-2.5 py-1 text-[10px] font-black text-white whitespace-nowrap">
          {title}
        </div>
      )}
    </div>
  );
}
