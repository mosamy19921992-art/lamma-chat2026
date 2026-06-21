import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Shield, ToggleLeft, Users } from "lucide-react";
import type { MemberRole } from "../../lib/chatTypes";
import {
  DEFAULT_GRANT_MATRIX,
  ROLE_LABELS,
  type RoleGrantsPolicy,
} from "../../lib/rolePolicy";
import {
  buildDefaultPolicyPayload,
  fetchAllRoomMemberGrants,
  fetchAllTempGrants,
  fetchRoleGrantsPolicy,
  saveRoleGrantsPolicy,
  type RoomGrantRow,
  type TempGrantRow,
} from "../../services/auth/rolePolicyService";
import { promoteMemberRole } from "../../services/auth/memberRoleService";

const MANAGEABLE_ROLES: MemberRole[] = [
  "admin",
  "mod",
  "host",
  "platinum_vip",
  "vip",
];

const GRANTER_ROLES: MemberRole[] = ["owner", "admin", "mod", "host"];

interface OwnerRoleManagementPanelProps {
  activeRoomId: string;
  currentUserNickname: string;
  chatMembers: Array<{ id: string; nickname: string; role: string }>;
  addSystemActivityLog: (
    type: string,
    userNickname: string,
    details: string,
  ) => void;
}

export function OwnerRoleManagementPanel({
  activeRoomId,
  currentUserNickname,
  chatMembers,
  addSystemActivityLog,
}: OwnerRoleManagementPanelProps) {
  const [policy, setPolicy] = useState<RoleGrantsPolicy>(buildDefaultPolicyPayload());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permGrants, setPermGrants] = useState<RoomGrantRow[]>([]);
  const [tempGrants, setTempGrants] = useState<TempGrantRow[]>([]);
  const [grantNick, setGrantNick] = useState("");
  const [grantRole, setGrantRole] = useState<MemberRole>("host");
  const [grantRoom, setGrantRoom] = useState(activeRoomId);
  const [grantTemporary, setGrantTemporary] = useState(false);
  const [grantBusy, setGrantBusy] = useState(false);
  const [status, setStatus] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    const [p, permanent, temp] = await Promise.all([
      fetchRoleGrantsPolicy(),
      fetchAllRoomMemberGrants(),
      fetchAllTempGrants(),
    ]);
    setPolicy(p);
    setPermGrants(permanent);
    setTempGrants(temp);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    setGrantRoom(activeRoomId);
  }, [activeRoomId]);

  const handleSavePolicy = async () => {
    setSaving(true);
    setStatus("");
    const result = await saveRoleGrantsPolicy(policy);
    setSaving(false);
    if (result.ok) {
      setStatus("✅ تم حفظ سياسة الرتب على السيرفر.");
      addSystemActivityLog(
        "promote",
        currentUserNickname,
        "تحديث سياسة الرتب ومصفوفة المنح من لوحة المالك.",
      );
    } else {
      setStatus(`❌ ${result.error || "فشل الحفظ"}`);
    }
  };

  const toggleRoleEnabled = (role: MemberRole) => {
    setPolicy((prev) => ({
      ...prev,
      enabledRoles: {
        ...prev.enabledRoles,
        [role]: !prev.enabledRoles[role],
      },
    }));
  };

  const toggleMatrixGrant = (granter: MemberRole, target: MemberRole) => {
    setPolicy((prev) => {
      const current = prev.grantMatrix[granter] || [];
      const next = current.includes(target)
        ? current.filter((r) => r !== target)
        : [...current, target];
      return {
        ...prev,
        grantMatrix: { ...prev.grantMatrix, [granter]: next },
      };
    });
  };

  const resetPolicy = () => {
    setPolicy(buildDefaultPolicyPayload());
    setStatus("تم استرجاع الإعدادات الافتراضية (كلامنجى) — اضغط حفظ لتطبيقها.");
  };

  const handleManualGrant = async () => {
    const member = chatMembers.find(
      (m) => m.nickname.toLowerCase() === grantNick.trim().toLowerCase(),
    );
    if (!member?.id) {
      alert("اختر عضواً موجوداً online من القائمة أو اكتب اسمه بالضبط.");
      return;
    }
    setGrantBusy(true);
    try {
      const result = await promoteMemberRole({
        roomId: grantRoom || activeRoomId,
        targetUserId: member.id,
        targetNickname: member.nickname,
        newRole: grantRole,
        operatorNickname: currentUserNickname,
        temporary: grantTemporary,
      });
      if (!result.ok) throw new Error(result.error || "grant_failed");
      setStatus(
        grantTemporary
          ? `✅ منح مؤقت: ${member.nickname} ← ${grantRole}`
          : `✅ منح دائم: ${member.nickname} ← ${grantRole}`,
      );
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "فشل المنح");
    } finally {
      setGrantBusy(false);
    }
  };

  const handleRevoke = async (row: RoomGrantRow | TempGrantRow) => {
    setGrantBusy(true);
    try {
      const result = await promoteMemberRole({
        roomId: row.room_id,
        targetUserId: row.user_id,
        targetNickname: row.nickname,
        newRole: "user",
        operatorNickname: currentUserNickname,
      });
      if (!result.ok) throw new Error(result.error || "revoke_failed");
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "فشل الإلغاء");
    } finally {
      setGrantBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-xs text-gray-400">
        <Loader2 size={14} className="animate-spin" />
        جاري تحميل نظام الرتب…
      </div>
    );
  }

  return (
    <div className="space-y-5 select-none" dir="rtl">
      <div className="p-4 rounded-2xl lamma-section-card border border-emerald-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={14} className="text-emerald-300" />
          <h4 className="text-xs font-black text-emerald-300">
            نظام الرتب — سياسة كلامنجى
          </h4>
        </div>
        <p className="text-[10px] text-gray-400 leading-relaxed">
          فعّل أو أوقف الرتب، وحدّد مَن يمنح مَن. المنح المؤقت ينتهي عند
          خروج العضو من الشات. الهوست = أول رتبة إشراف (كتم/طرد/تنبيه) ويمكنه
          منح VIP مؤقت.
        </p>
      </div>

      {/* Enable / disable roles */}
      <div className="p-4 rounded-2xl lamma-admin-card space-y-3">
        <h5 className="text-[10px] font-black text-white uppercase tracking-wide">
          تفعيل / إيقاف الرتب
        </h5>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {MANAGEABLE_ROLES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => toggleRoleEnabled(role)}
              className={`py-2 px-2 rounded-xl text-[9px] font-black border transition-all ${
                policy.enabledRoles[role]
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 bg-black/40 text-gray-500 line-through"
              }`}
            >
              {ROLE_LABELS[role]}
            </button>
          ))}
        </div>
      </div>

      {/* Grant matrix */}
      <div className="p-4 rounded-2xl lamma-admin-card space-y-3 overflow-x-auto">
        <h5 className="text-[10px] font-black text-white">
          مصفوفة المنح (من يرقّي مَن)
        </h5>
        <table className="w-full text-[9px] text-right min-w-[320px]">
          <thead>
            <tr className="text-gray-500">
              <th className="p-1">يمنح ↓ / الرتبة →</th>
              {MANAGEABLE_ROLES.map((r) => (
                <th key={r} className="p-1 text-center">
                  {r.replace("_", " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GRANTER_ROLES.map((granter) => (
              <tr key={granter} className="border-t border-white/5">
                <td className="p-1 font-bold text-gray-300">{ROLE_LABELS[granter]}</td>
                {MANAGEABLE_ROLES.map((target) => {
                  const checked = (policy.grantMatrix[granter] || []).includes(target);
                  const isDefault = (DEFAULT_GRANT_MATRIX[granter] || []).includes(target);
                  return (
                    <td key={target} className="p-1 text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMatrixGrant(granter, target)}
                        className="accent-emerald-500"
                        title={isDefault ? "افتراضي كلامنجى" : ""}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => void handleSavePolicy()}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-[10px] font-black lamma-accent-btn disabled:opacity-50"
          >
            {saving ? "جاري الحفظ…" : "💾 حفظ السياسة على السيرفر"}
          </button>
          <button
            type="button"
            onClick={resetPolicy}
            className="px-3 py-2 rounded-xl text-[10px] font-bold lamma-muted-btn"
          >
            ↩️ افتراضي كلامنجى
          </button>
        </div>
      </div>

      {/* Manual grant */}
      <div className="p-4 rounded-2xl lamma-admin-card space-y-3">
        <h5 className="text-[10px] font-black text-white flex items-center gap-1.5">
          <Users size={12} />
          منح يدوي سريع
        </h5>
        <div className="grid grid-cols-2 gap-2">
          <input
            list="role-grant-members"
            value={grantNick}
            onChange={(e) => setGrantNick(e.target.value)}
            placeholder="اسم العضو"
            className="col-span-2 rounded-xl p-2 text-[10px] lamma-input-shell"
          />
          <datalist id="role-grant-members">
            {chatMembers.map((m) => (
              <option key={m.id} value={m.nickname} />
            ))}
          </datalist>
          <select
            value={grantRole}
            onChange={(e) => setGrantRole(e.target.value as MemberRole)}
            className="rounded-xl p-2 text-[10px] lamma-input-shell"
          >
            {MANAGEABLE_ROLES.filter((r) => policy.enabledRoles[r]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <input
            value={grantRoom}
            onChange={(e) => setGrantRoom(e.target.value)}
            placeholder="room_id"
            className="rounded-xl p-2 text-[10px] lamma-input-shell"
          />
        </div>
        <label className="flex items-center gap-2 text-[10px] text-amber-200/90 cursor-pointer">
          <input
            type="checkbox"
            checked={grantTemporary}
            onChange={(e) => setGrantTemporary(e.target.checked)}
            className="accent-amber-400"
          />
          <ToggleLeft size={12} />
          تاج/رتبة مؤقتة (تنتهي عند خروج العضو من الشات)
        </label>
        <button
          type="button"
          disabled={grantBusy}
          onClick={() => void handleManualGrant()}
          className="w-full py-2 rounded-xl text-[10px] font-black lamma-accent-btn disabled:opacity-50"
        >
          {grantBusy ? "…" : "✨ منح الرتبة"}
        </button>
      </div>

      {/* Active grants lists */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-2xl lamma-section-card space-y-2 max-h-48 overflow-y-auto">
          <h6 className="text-[9px] font-black text-gray-300">رتب دائمة ({permGrants.length})</h6>
          {permGrants.length === 0 ? (
            <p className="text-[9px] text-gray-600">لا توجد</p>
          ) : (
            permGrants.slice(0, 30).map((g) => (
              <div
                key={`${g.room_id}-${g.user_id}`}
                className="flex items-center justify-between gap-1 text-[9px] border-b border-white/5 pb-1"
              >
                <span className="truncate">
                  {g.nickname} · {g.role} · {g.room_id}
                </span>
                <button
                  type="button"
                  onClick={() => void handleRevoke(g)}
                  className="text-red-400 shrink-0"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
        <div className="p-3 rounded-2xl lamma-section-card space-y-2 max-h-48 overflow-y-auto">
          <h6 className="text-[9px] font-black text-amber-300/90">
            تاجات مؤقتة ({tempGrants.length})
          </h6>
          {tempGrants.length === 0 ? (
            <p className="text-[9px] text-gray-600">لا توجد</p>
          ) : (
            tempGrants.slice(0, 30).map((g) => (
              <div
                key={`temp-${g.room_id}-${g.user_id}`}
                className="flex items-center justify-between gap-1 text-[9px] border-b border-white/5 pb-1"
              >
                <span className="truncate">
                  ⏳ {g.nickname} · {g.role} · {g.room_id}
                </span>
                <button
                  type="button"
                  onClick={() => void handleRevoke(g)}
                  className="text-red-400 shrink-0"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {status && (
        <p className="text-[10px] font-bold text-center text-emerald-300/90">{status}</p>
      )}
    </div>
  );
}

export default OwnerRoleManagementPanel;
