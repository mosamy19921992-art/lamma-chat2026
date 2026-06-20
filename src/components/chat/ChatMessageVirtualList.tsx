import { useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export type ChatMessageVirtualListProps<T> = {
  messages: T[];
  parentRef: React.RefObject<HTMLDivElement | null>;
  estimateSize?: number;
  renderMessage: (msg: T, index: number) => ReactNode;
};

/** Windowed message list — renders only visible rows for large rooms. */
export function ChatMessageVirtualList<T>({
  messages,
  parentRef,
  estimateSize = 72,
  renderMessage,
}: ChatMessageVirtualListProps<T>) {
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 8,
  });

  const items = virtualizer.getVirtualItems();

  if (messages.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
      }}
    >
      {items.map((virtualRow) => {
        const msg = messages[virtualRow.index];
        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderMessage(msg, virtualRow.index)}
          </div>
        );
      })}
    </div>
  );
}
