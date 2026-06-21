import { useMemo, useState } from "react";
import {
  DoorOpen,
  Image,
  Mic,
  Music,
  Phone,
  Radio,
  Search,
  Tv,
  Video,
  X,
} from "lucide-react";
import type { MemberCustomPermissions } from "../../lib/chatTypes";
import { EMPTY_MEMBER_PERMISSIONS } from "../../lib/chatHelpers";

export type OwnerFeatureKey =
  | "voiceMessages"
  | "audioCalls"
  | "videoCalls"
  | "musicRadio"
  | "roomCreation"
  | "imageUpload"
  | "youtubeShare";

const FEATURE_META: Record<
  OwnerFeatureKey,
  { label: string; desc: string; permKey: keyof MemberCustomPermissions }
> = {
  voiceMessages: {
    label: "رسائل صوتية",
    desc: "تسجيل وإرسال رسائل صوتية في الغرف والخاص.",
    permKey: "recordingAllowed",
  },
  audioCalls: {
    label: "مكالمات صوتية",
    desc: "مكالمات صوت WebRTC من الرسائل الخاصة.",
    permKey: "callsAllowed",
  },
  videoCalls: {
    label: "مكالمات فيdeo",
    desc: "مكالمات فيdeo بالكاميرا من الرسائل الخاصة.",
    permKey: "videoCallsAllowed",
  },
  musicRadio: {
    label: "الموسيقى والراديو",
    desc: "تشغيل راديو لمة ومكتبة الموسيقى — للأعضاء المحددين فقط.",
    permKey: "musicRadioAllowed",
  },
  roomCreation: {
    label: "إنشاء غرف",
    desc: "إنشاء غرف خاصة بكلمة مرور — حدد عدد الغرف لكل عضو (1، 2، 3…).",
    permKey: "roomCreationAllowed",
  },
  imageUpload: {
    label: "رفع الصور",
    desc: "رفع صور حقيقية إلى Supabase ومشاركة روابط الصور.",
    permKey: "imagesAllowed",
  },
  youtubeShare: {
    label: "يوتيوب / فيdeo",
    desc: "مشاركة روابط يوتيوب أو فيdeo في الرسائل.",
    permKey: "youtubeAllowed",
  },
};

const FEATURE_ICONS: Record<OwnerFeatureKey, typeof Mic> = {
  voiceMessages: Mic,
  audioCalls: Phone,
  videoCalls: Video,
  musicRadio: Radio,
  roomCreation: DoorOpen,
  imageUpload: Image,
  youtubeShare: Tv,
};

const ROOM_CREATION_QUOTA_CYCLE = [0, 1, 2, 3, 5] as const;

function quotaLabel(quota: number): string {
  if (quota <= 0) return "⛔ موقوف";
  if (quota === 1) return "🔒 غرفة واحدة";
  if (quota === 2) return "🔒 غرفتين";
  return `🔒 ${quota} غرف`;
}

interface OwnerMemberFeaturesPanelProps {
  registeredMemberNames: string[];
  memberCustomPermissions: Record<string, MemberCustomPermissions>;
  setMemberCustomPermissions: React.Dispatch<
    React.SetStateAction<Record<string, MemberCustomPermissions>>
  >;
  addSystemActivityLog: (
    type: "login" | "logout" | "ban" | "promote" | "demote",
    userNickname: string,
    details: string,
    operator?: string,
  ) => void;
  currentUserNickname: string;
}

function defaultPerms(): MemberCustomPermissions {
  return { ...EMPTY_MEMBER_PERMISSIONS };
}

export function OwnerMemberFeaturesPanel({
  registeredMemberNames,
  memberCustomPermissions,
  setMemberCustomPermissions,
  addSystemActivityLog,
  currentUserNickname,
}: OwnerMemberFeaturesPanelProps) {
  const [activeFeature, setActiveFeature] = useState<OwnerFeatureKey | null>(
    null,
  );
  const [query, setQuery] = useState("");

  const filteredNames = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return registeredMemberNames;
    return registeredMemberNames.filter((n) => n.toLowerCase().includes(q));
  }, [query, registeredMemberNames]);

  const toggleMemberFeature = (nickname: string, enabled: boolean) => {
    if (!activeFeature) return;
    const { permKey, label } = FEATURE_META[activeFeature];

    setMemberCustomPermissions((prev) => ({
      ...prev,
      [nickname]: {
        ...(prev[nickname] || defaultPerms()),
        [permKey]: enabled,
        ...(activeFeature === "roomCreation"
          ? { roomCreationQuota: enabled ? 1 : 0 }
          : {}),
      },
    }));

    addSystemActivityLog(
      "promote",
      nickname,
      `${enabled ? "تفعيل" : "إلغاء"} «${label}» للعضو ${nickname}`,
      currentUserNickname,
    );
  };

  const cycleRoomCreationQuota = (nickname: string) => {
    const current =
      memberCustomPermissions[nickname]?.roomCreationQuota ??
      (memberCustomPermissions[nickname]?.roomCreationAllowed ? 1 : 0);
    const idx = ROOM_CREATION_QUOTA_CYCLE.indexOf(
      current as (typeof ROOM_CREATION_QUOTA_CYCLE)[number],
    );
    const next =
      ROOM_CREATION_QUOTA_CYCLE[
        (idx >= 0 ? idx + 1 : 1) % ROOM_CREATION_QUOTA_CYCLE.length
      ];

    setMemberCustomPermissions((prev) => ({
      ...prev,
      [nickname]: {
        ...(prev[nickname] || defaultPerms()),
        roomCreationAllowed: next > 0,
        roomCreationQuota: next,
      },
    }));

    addSystemActivityLog(
      "promote",
      nickname,
      `تعديل حصة إنشاء الغرف لـ ${nickname}: ${quotaLabel(next)}`,
      currentUserNickname,
    );
  };

  const isFeatureEnabled = (nickname: string, key: OwnerFeatureKey) => {
    if (key === "roomCreation") {
      return (memberCustomPermissions[nickname]?.roomCreationQuota || 0) > 0;
    }
    const permKey = FEATURE_META[key].permKey;
    return !!memberCustomPermissions[nickname]?.[permKey];
  };

  return (
    <div className="space-y-4 select-none" dir="rtl">
      <div className="rounded-2xl p-4 lamma-admin-card border border-lime-500/20 bg-lime-500/5">
        <h4 className="text-sm font-black text-lime-300 mb-1">
          صلاحيات الأعضاء — تفعيل وإيقاف لكل ميزة
        </h4>
        <p className="text-[10px] text-gray-400 leading-relaxed">
          كل ميزة في الشات (موسيقى، راديو، صور، يوتيوب، مكالمات، صوت، غرف…) يمكن
          منحها أو إيقافها لأي عضو مسجّل. المالك فقط يتحكم هنا.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {(Object.keys(FEATURE_META) as OwnerFeatureKey[]).map((key) => {
          const meta = FEATURE_META[key];
          const Icon = FEATURE_ICONS[key];
          const enabledCount = registeredMemberNames.filter((n) =>
            isFeatureEnabled(n, key),
          ).length;

          return (
            <div
              key={key}
              className="p-4 rounded-xl lamma-admin-card border border-white/10 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2 text-white">
                <Icon size={16} className="text-lime-300" />
                <span className="text-xs font-black">{meta.label}</span>
              </div>
              <p className="text-[10px] text-gray-500 flex-1">{meta.desc}</p>
              <div className="text-[9px] text-gray-400">
                مفعّل لـ {enabledCount} عضو
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveFeature(key);
                  setQuery("");
                }}
                className="w-full py-2 rounded-xl text-[10px] font-black bg-lime-600/20 text-lime-300 border border-lime-500/30 hover:bg-lime-600/30 transition-all"
              >
                تفعيل / إيقاف
              </button>
            </div>
          );
        })}
      </div>

      {activeFeature && (
        <div className="rounded-2xl p-4 lamma-admin-card border border-white/10 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                {activeFeature === "musicRadio" && (
                  <Music size={14} className="text-cyan-300" />
                )}
                {FEATURE_META[activeFeature].label}
              </div>
              <div className="text-[10px] text-gray-500">
                {activeFeature === "roomCreation"
                  ? "اضغط على الاسم لتغيير عدد الغرف المسموح بها"
                  : "اضغط على الاسم للتفعيل أو الإيقاف"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveFeature(null)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
              aria-label="إغلاق"
            >
              <X size={14} />
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
              placeholder="ابحث بالاسم…"
              className="w-full pr-9 pl-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-gray-500"
            />
          </div>

          {registeredMemberNames.length === 0 ? (
            <p className="text-[11px] text-yellow-400/90 text-center py-4">
              لا يوجد أعضاء مسجّلون متصلون الآن. يمكنك أيضاً التفعيل من بروفايل
              العضو مباشرة.
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {filteredNames.map((nickname) => {
                const on = isFeatureEnabled(nickname, activeFeature);
                const roomQuota =
                  memberCustomPermissions[nickname]?.roomCreationQuota || 0;
                return (
                  <button
                    key={nickname}
                    type="button"
                    onClick={() =>
                      activeFeature === "roomCreation"
                        ? cycleRoomCreationQuota(nickname)
                        : toggleMemberFeature(nickname, !on)
                    }
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all border ${
                      on
                        ? "bg-green-500/10 border-green-500/30 text-green-300"
                        : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    <span>{nickname}</span>
                    <span className="text-[9px]">
                      {activeFeature === "roomCreation"
                        ? quotaLabel(roomQuota)
                        : on
                          ? "✅ مفعّل"
                          : "⛔ موقوف"}
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
