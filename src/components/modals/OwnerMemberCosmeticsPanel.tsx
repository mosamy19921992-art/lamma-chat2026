import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, Flame, Palette, Search, Snowflake, Sparkles, X } from "lucide-react";
import {
  COSMETIC_FRAME_PRESETS,
  type MemberCosmeticGrant,
} from "../../lib/chatTypes";

export type OwnerCosmeticKey = "vip" | "platinum" | "frame_fire" | "frame_ice" | "frame_rainbow";

const COSMETIC_META: Record<
  OwnerCosmeticKey,
  {
    label: string;
    desc: string;
    icon: typeof Crown;
    iconClass: string;
  }
> = {
  vip: {
    label: "VIP — تاج وشارة",
    desc: "تاج أزرق وشارة VIP بجانب الاسم (بدون اشتراك).",
    icon: Crown,
    iconClass: "text-sky-300",
  },
  platinum: {
    label: "Platinum — اسم متوهج",
    desc: "تاج + اسم متدرج + شارة PLATINUM VIP.",
    icon: Sparkles,
    iconClass: "text-amber-300",
  },
  frame_fire: {
    label: "إطار اللهب 🔥",
    desc: "هالة نارية حول الأفاتار مثل المتجر.",
    icon: Flame,
    iconClass: "text-orange-400",
  },
  frame_ice: {
    label: "إطار الجليد ❄️",
    desc: "إطار بارد متوهج حول الصورة.",
    icon: Snowflake,
    iconClass: "text-cyan-300",
  },
  frame_rainbow: {
    label: "إطار قوس قزح 🌈",
    desc: "إطار ألوان طيفية حول الأفاتار.",
    icon: Palette,
    iconClass: "text-fuchsia-300",
  },
};

interface OwnerMemberCosmeticsPanelProps {
  registeredMemberNames: string[];
  memberCosmeticGrants: Record<string, MemberCosmeticGrant>;
  setMemberCosmeticGrants: React.Dispatch<
    React.SetStateAction<Record<string, MemberCosmeticGrant>>
  >;
  addSystemActivityLog: (
    type: "login" | "logout" | "ban" | "promote" | "demote",
    userNickname: string,
    details: string,
    operator?: string,
  ) => void;
  currentUserNickname: string;
}

function emptyGrant(): MemberCosmeticGrant {
  return { vipTier: null, frame: null };
}

function isCosmeticEnabled(
  grant: MemberCosmeticGrant | undefined,
  key: OwnerCosmeticKey,
): boolean {
  if (!grant) return false;
  if (key === "vip") return grant.vipTier === "vip";
  if (key === "platinum") return grant.vipTier === "platinum";
  if (key === "frame_fire") return grant.frame === COSMETIC_FRAME_PRESETS.fire;
  if (key === "frame_ice") return grant.frame === COSMETIC_FRAME_PRESETS.ice;
  if (key === "frame_rainbow") return grant.frame === COSMETIC_FRAME_PRESETS.rainbow;
  return false;
}

export function OwnerMemberCosmeticsPanel({
  registeredMemberNames,
  memberCosmeticGrants,
  setMemberCosmeticGrants,
  addSystemActivityLog,
  currentUserNickname,
}: OwnerMemberCosmeticsPanelProps) {
  const [activeCosmetic, setActiveCosmetic] = useState<OwnerCosmeticKey | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [manualNickname, setManualNickname] = useState("");
  const managePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeCosmetic) return;
    managePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeCosmetic]);

  const filteredNames = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return registeredMemberNames;
    return registeredMemberNames.filter((n) => n.toLowerCase().includes(q));
  }, [query, registeredMemberNames]);

  const toggleCosmetic = (nickname: string, enabled: boolean) => {
    if (!activeCosmetic) return;
    const meta = COSMETIC_META[activeCosmetic];

    setMemberCosmeticGrants((prev) => {
      const current = prev[nickname] || emptyGrant();
      let next: MemberCosmeticGrant = { ...current };

      if (activeCosmetic === "vip") {
        next.vipTier = enabled ? "vip" : current.vipTier === "vip" ? null : current.vipTier;
      } else if (activeCosmetic === "platinum") {
        next.vipTier = enabled
          ? "platinum"
          : current.vipTier === "platinum"
            ? null
            : current.vipTier;
      } else if (activeCosmetic === "frame_fire") {
        next.frame = enabled
          ? COSMETIC_FRAME_PRESETS.fire
          : current.frame === COSMETIC_FRAME_PRESETS.fire
            ? null
            : current.frame;
      } else if (activeCosmetic === "frame_ice") {
        next.frame = enabled
          ? COSMETIC_FRAME_PRESETS.ice
          : current.frame === COSMETIC_FRAME_PRESETS.ice
            ? null
            : current.frame;
      } else if (activeCosmetic === "frame_rainbow") {
        next.frame = enabled
          ? COSMETIC_FRAME_PRESETS.rainbow
          : current.frame === COSMETIC_FRAME_PRESETS.rainbow
            ? null
            : current.frame;
      }

      if (!next.vipTier && !next.frame) {
        const copy = { ...prev };
        delete copy[nickname];
        return copy;
      }

      return { ...prev, [nickname]: next };
    });

    addSystemActivityLog(
      "promote",
      nickname,
      `${enabled ? "منح" : "سحب"} «${meta.label}» ${enabled ? "لـ" : "من"} ${nickname}`,
      currentUserNickname,
    );
  };

  return (
    <div className="space-y-4 select-none" dir="rtl">
      <div className="rounded-2xl p-4 lamma-admin-card border border-amber-500/20 bg-amber-500/5">
        <h4 className="text-sm font-black text-amber-300 mb-1">
          منح المظهر والتميز (بدون اشتراك)
        </h4>
        <p className="text-[10px] text-gray-400 leading-relaxed">
          امنح أي عضو مسجّل إطاراً أو VIP أو Platinum من هنا — منفصل عن المتجر.
          التأثيرات تظهر فوراً للجميع في الشات.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(Object.keys(COSMETIC_META) as OwnerCosmeticKey[]).map((key) => {
          const meta = COSMETIC_META[key];
          const Icon = meta.icon;
          const enabledCount = registeredMemberNames.filter((n) =>
            isCosmeticEnabled(memberCosmeticGrants[n], key),
          ).length;

          return (
            <div
              key={key}
              className="p-4 rounded-xl lamma-admin-card border border-white/10 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2 text-white">
                <Icon size={16} className={meta.iconClass} />
                <span className="text-xs font-black">{meta.label}</span>
              </div>
              <p className="text-[10px] text-gray-500 flex-1">{meta.desc}</p>
              <div className="text-[9px] text-gray-400">
                ممنوح لـ {enabledCount} عضو
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveCosmetic(key);
                  setQuery("");
                  setManualNickname("");
                }}
                onPointerDown={(event) => event.stopPropagation()}
                className="w-full py-2 rounded-xl text-[10px] font-black bg-amber-600/15 text-amber-200 border border-amber-500/25 hover:bg-amber-600/25 transition-all cursor-pointer"
              >
                منح / إدارة
              </button>
            </div>
          );
        })}
      </div>

      {activeCosmetic && (
        <div
          ref={managePanelRef}
          className="rounded-2xl p-4 lamma-admin-card border border-amber-500/30 bg-amber-500/5 space-y-3 ring-1 ring-amber-500/20"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-black text-white">
                {COSMETIC_META[activeCosmetic].label}
              </div>
              <div className="text-[10px] text-amber-200/90 font-bold">
                اختر عضواً من القائمة — أو اكتب الاسم بالأسفل
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveCosmetic(null)}
              onPointerDown={(event) => event.stopPropagation()}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer"
              aria-label="إغلاق"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={manualNickname}
              onChange={(e) => setManualNickname(e.target.value)}
              onPointerDown={(event) => event.stopPropagation()}
              placeholder="اسم العضو (حتى لو غير متصل)"
              className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-gray-500"
            />
            <button
              type="button"
              disabled={!manualNickname.trim()}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                const nickname = manualNickname.trim();
                if (!nickname) return;
                toggleCosmetic(nickname, true);
                setManualNickname("");
              }}
              className="px-4 py-2 rounded-xl text-[10px] font-black bg-amber-600/20 text-amber-100 border border-amber-500/30 hover:bg-amber-600/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              منح بالاسم
            </button>
          </div>

          <div className="relative">
            <Search
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onPointerDown={(event) => event.stopPropagation()}
              placeholder="ابحث بالاسم…"
              className="w-full pr-9 pl-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-gray-500"
            />
          </div>

          {registeredMemberNames.length === 0 ? (
            <p className="text-[11px] text-yellow-400/90 text-center py-4">
              لا يوجد أعضاء مسجّلون متصلون الآن — استخدم «منح بالاسم» أعلاه.
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {filteredNames.map((nickname) => {
                const on = isCosmeticEnabled(
                  memberCosmeticGrants[nickname],
                  activeCosmetic,
                );
                return (
                  <button
                    key={nickname}
                    type="button"
                    onClick={() => toggleCosmetic(nickname, !on)}
                    onPointerDown={(event) => event.stopPropagation()}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all border cursor-pointer ${
                      on
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                        : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    <span>{nickname}</span>
                    <span className="text-[9px]">
                      {on ? "✅ ممنوح" : "➕ منح"}
                    </span>
                  </button>
                );
              })}
              {filteredNames.length === 0 && (
                <p className="text-[10px] text-gray-500 text-center py-3">
                  لا توجد نتائج للبحث.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
