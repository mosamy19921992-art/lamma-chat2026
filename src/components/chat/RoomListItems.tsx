import type { RoomListEntry } from "../../lib/chatConstants";

interface RoomListItemsProps {
  rooms: RoomListEntry[];
  activeRoomId: string;
  onSelect: (room: RoomListEntry) => void;
  variant?: "mobile" | "desktop";
}

export function RoomListItems({
  rooms,
  activeRoomId,
  onSelect,
  variant = "desktop",
}: RoomListItemsProps) {
  if (rooms.length === 0) return null;

  return (
    <div className="space-y-1">
      {rooms.map((room) => {
        const isActive = room.id === activeRoomId;
        const label = (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base leading-none shrink-0">{room.icon}</span>
              <span className="truncate">{room.name}</span>
            </div>
            <span
              className={
                variant === "mobile"
                  ? "bg-black/60 px-2 py-0.5 rounded-full border lamma-accent-border-soft text-[9px] lamma-accent-text-soft font-black font-mono shrink-0"
                  : "px-2 py-0.5 rounded-full text-[9px] text-[color:var(--accent-secondary)] font-black font-mono lamma-room-count-pill shrink-0"
              }
            >
              {room.count}
            </span>
          </>
        );

        if (variant === "mobile") {
          return (
            <div
              key={room.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(room)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(room);
                }
              }}
              className={`p-2.5 rounded-xl border transition-all text-xs font-black cursor-pointer flex items-center justify-between lamma-list-item ${
                isActive
                  ? "bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_10px_rgba(16,185,129,0.08)]"
                  : "bg-black/12 border-white/5 text-gray-300"
              }`}
            >
              {label}
            </div>
          );
        }

        return (
          <button
            key={room.id}
            type="button"
            onClick={() => onSelect(room)}
            className={`w-full p-2.5 rounded-2xl transition-all text-xs font-black cursor-pointer flex items-center justify-between ${
              isActive
                ? "bg-[rgba(16,185,129,0.10)] border border-[rgba(16,185,129,0.35)] text-[color:var(--accent-primary)] lamma-soft-glow lamma-room-list-card"
                : "text-gray-200 lamma-room-list-card"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default RoomListItems;
