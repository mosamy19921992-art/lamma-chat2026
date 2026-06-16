import React from "react";
import { computeAchievements, getUserStats } from "../lib/achievements";

interface AchievementsBlockProps {
  role: string;
  compact?: boolean;
}

export function AchievementsBlock({ role, compact = false }: AchievementsBlockProps) {
  const achievements = computeAchievements(getUserStats(), role);
  const earned = achievements.filter((item) => item.earned);
  const locked = achievements.filter((item) => !item.earned);

  return (
    <div
      className={`rounded-xl text-right lamma-list-item ${compact ? "p-2.5" : "p-3 bg-black/20"}`}
      dir="rtl"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={compact ? "text-lg" : "text-xl"}>🏆</span>
        <div className="flex-1 min-w-0">
          <div
            className={`font-black text-green-300 ${compact ? "text-[10px]" : "text-[11px]"}`}
          >
            أوسمة الإنجازات
          </div>
          <div
            className={`text-gray-500 font-bold mt-0.5 ${compact ? "text-[8.5px]" : "text-[9px]"}`}
          >
            {earned.length} / {achievements.length} مفتوحة
          </div>
        </div>
      </div>

      {earned.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {earned.map((item) => (
            <span
              key={item.id}
              title={`${item.title}: ${item.description}`}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-400/20 text-[9px] font-black text-emerald-200"
            >
              <span>{item.icon}</span>
              <span>{item.title}</span>
            </span>
          ))}
        </div>
      ) : (
        <div className="text-[9px] text-gray-500 font-bold mb-2">
          ابدأ بالمحادثة لتحصل على أول وسام 🌟
        </div>
      )}

      {locked.length > 0 && (
        <div className="space-y-1">
          {locked.slice(0, compact ? 2 : 3).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 text-[8.5px] text-gray-500"
            >
              <span className="truncate">{item.description}</span>
              <span className="shrink-0 opacity-70">
                {item.icon} {item.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
