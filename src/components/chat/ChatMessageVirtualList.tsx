import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export type ChatMessageVirtualListHandle = {
  scrollToBottom: (behavior?: ScrollBehavior) => void;
};

export type ChatMessageVirtualListProps<T> = {
  messages: T[];
  parentRef: RefObject<HTMLDivElement | null>;
  estimateSize?: number;
  getEstimateSize?: (item: T, index: number) => number;
  /** Below this count, render all rows without virtualization overhead. */
  minVirtualCount?: number;
  getItemKey?: (item: T, index: number) => string | number;
  renderMessage: (msg: T, index: number) => ReactNode;
};

function VirtualizedMessageRows<T>({
  messages,
  parentRef,
  estimateSize,
  getEstimateSize,
  renderMessage,
  listRef,
}: Required<
  Pick<ChatMessageVirtualListProps<T>, "messages" | "parentRef" | "renderMessage">
> &
  Pick<ChatMessageVirtualListProps<T>, "estimateSize" | "getEstimateSize"> & {
    listRef: RefObject<ChatMessageVirtualListHandle | null>;
  }) {
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) =>
      getEstimateSize?.(messages[index], index) ?? estimateSize ?? 72,
    overscan: 8,
  });

  useImperativeHandle(
    listRef,
    () => ({
      scrollToBottom: (behavior: ScrollBehavior = "auto") => {
        if (!parentRef.current || messages.length === 0) return;
        virtualizer.scrollToIndex(messages.length - 1, {
          align: "end",
          behavior,
        });
      },
    }),
    [messages.length, parentRef, virtualizer],
  );

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
export const ChatMessageVirtualList = forwardRef(function ChatMessageVirtualList<
  T,
>(
  {
    messages,
    parentRef,
    estimateSize = 72,
    getEstimateSize,
    minVirtualCount = 30,
    getItemKey,
    renderMessage,
  }: ChatMessageVirtualListProps<T>,
  ref: React.ForwardedRef<ChatMessageVirtualListHandle>,
) {
  const innerVirtualRef = useRef<ChatMessageVirtualListHandle | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      scrollToBottom: (behavior: ScrollBehavior = "auto") => {
        if (messages.length < minVirtualCount) {
          const el = parentRef.current;
          el?.scrollTo({ top: el.scrollHeight, behavior });
          return;
        }
        innerVirtualRef.current?.scrollToBottom(behavior);
      },
    }),
    [messages.length, minVirtualCount, parentRef],
  );

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
      getEstimateSize={getEstimateSize}
      renderMessage={renderMessage}
      listRef={innerVirtualRef}
    />
  );
}) as <T>(
  props: ChatMessageVirtualListProps<T> & {
    ref?: React.ForwardedRef<ChatMessageVirtualListHandle>;
  },
) => React.ReactElement | null;
