import type { ReactNode, RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export type ChatMessageVirtualListProps<T> = {
  messages: T[];
  parentRef: RefObject<HTMLDivElement | null>;
  estimateSize?: number;
  /** Below this count, render all rows without virtualization overhead. */
  minVirtualCount?: number;
  getItemKey?: (item: T, index: number) => string | number;
  renderMessage: (msg: T, index: number) => ReactNode;
};

function VirtualizedMessageRows<T>({
  messages,
  parentRef,
  estimateSize,
  renderMessage,
}: Required<
  Pick<ChatMessageVirtualListProps<T>, "messages" | "parentRef" | "renderMessage">
> &
  Pick<ChatMessageVirtualListProps<T>, "estimateSize">) {
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize ?? 72,
    overscan: 8,
  });

  const items = virtualizer.getVirtualItems();

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
              minWidth: 0,
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

/** Windowed message list — renders only visible rows for large rooms. */
export function ChatMessageVirtualList<T>({
  messages,
  parentRef,
  estimateSize = 72,
  minVirtualCount = 30,
  getItemKey,
  renderMessage,
}: ChatMessageVirtualListProps<T>) {
  if (messages.length === 0) {
    return null;
  }

  if (messages.length < minVirtualCount) {
    return (
      <>
        {messages.map((msg, index) => (
          <div key={getItemKey?.(msg, index) ?? index}>
            {renderMessage(msg, index)}
          </div>
        ))}
      </>
    );
  }

  return (
    <VirtualizedMessageRows
      messages={messages}
      parentRef={parentRef}
      estimateSize={estimateSize}
      renderMessage={renderMessage}
    />
  );
}
