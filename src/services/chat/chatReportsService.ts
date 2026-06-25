import { supabase } from "../../lib/supabase";
import {
  establishGuestAuth,
  getAuthenticatedUid,
} from "../auth/guestAuthService";

export type ChatReportStatus = "open" | "resolved" | "dismissed";

export interface ChatReport {
  id: string;
  createdAt: string;
  reporterUid: string;
  reporterNickname: string;
  reportedNickname: string;
  roomId: string;
  roomName?: string;
  messageId?: string;
  messageExcerpt: string;
  reason?: string;
  status: ChatReportStatus;
  resolvedBy?: string;
  resolvedAt?: string;
}

const STORAGE_KEY = "lamma_chat_reports";
const MAX_LOCAL = 200;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPersistedReportId(id: string): boolean {
  return UUID_RE.test(id);
}

function isEphemeralReportId(id: string): boolean {
  return (
    id.startsWith("local-report-") || id.startsWith("remote-report-")
  );
}

function loadLocalReports(): ChatReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalReports(reports: ChatReport[]): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(reports.slice(0, MAX_LOCAL)),
    );
  } catch {
    // storage full
  }
}

function mapRow(row: Record<string, unknown>): ChatReport {
  return {
    id: String(row.id),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    reporterUid: String(row.reporter_uid ?? ""),
    reporterNickname: String(row.reporter_nickname ?? ""),
    reportedNickname: String(row.reported_nickname ?? ""),
    roomId: String(row.room_id ?? ""),
    roomName: row.room_name ? String(row.room_name) : undefined,
    messageId: row.message_id ? String(row.message_id) : undefined,
    messageExcerpt: String(row.message_excerpt ?? ""),
    reason: row.reason ? String(row.reason) : undefined,
    status: (row.status as ChatReportStatus) || "open",
    resolvedBy: row.resolved_by ? String(row.resolved_by) : undefined,
    resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
  };
}

function reportFingerprint(report: ChatReport): string {
  return [
    report.reporterUid,
    report.roomId,
    report.messageId || "",
    report.messageExcerpt,
  ].join("|");
}

export function mergeChatReports(
  local: ChatReport[],
  remote: ChatReport[],
): ChatReport[] {
  const byId = new Map<string, ChatReport>();
  const remoteFingerprints = new Set(remote.map(reportFingerprint));

  for (const report of remote) {
    byId.set(report.id, report);
  }

  for (const report of local) {
    if (isEphemeralReportId(report.id)) {
      if (remoteFingerprints.has(reportFingerprint(report))) continue;
    }
    if (!byId.has(report.id)) {
      byId.set(report.id, report);
    }
  }

  return [...byId.values()].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getCachedChatReports(): ChatReport[] {
  return loadLocalReports();
}

export async function fetchChatReportsRemote(): Promise<ChatReport[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("chat_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.warn("[Reports] Remote fetch failed:", error.message);
    return [];
  }
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function syncChatReportsForStaff(): Promise<ChatReport[]> {
  const remote = await fetchChatReportsRemote();
  const local = loadLocalReports();
  const merged = mergeChatReports(local, remote);
  saveLocalReports(merged);
  return merged;
}

export interface SubmitChatReportInput {
  reporterUid?: string;
  reporterNickname: string;
  reporterColor?: string;
  reportedNickname: string;
  roomId: string;
  roomName?: string;
  messageId?: string;
  messageExcerpt: string;
  reason?: string;
}

/** Ensures Supabase auth.uid() matches reporter_uid for RLS (incl. anonymous guests). */
export async function resolveReportAuthUid(input: {
  nickname: string;
  color?: string;
  uid?: string | null;
}): Promise<string | null> {
  if (!supabase) return input.uid?.trim() || null;

  const sessionUid = await getAuthenticatedUid();
  if (sessionUid) return sessionUid;

  try {
    return await establishGuestAuth(
      input.nickname,
      input.color?.trim() || "#10b981",
    );
  } catch (error) {
    console.warn("[Reports] Guest auth reconcile failed:", error);
    return input.uid?.trim() || null;
  }
}

async function fetchOwnReportById(
  reportId: string,
): Promise<ChatReport | null> {
  if (!supabase || !isPersistedReportId(reportId)) return null;
  const { data, error } = await supabase
    .from("chat_reports")
    .select("*")
    .eq("id", reportId)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function submitChatReport(
  input: SubmitChatReportInput,
): Promise<{ ok: boolean; error?: string; report?: ChatReport }> {
  const excerpt = input.messageExcerpt.trim().slice(0, 500);
  const reason = input.reason?.trim().slice(0, 300) || undefined;
  if (!excerpt) {
    return { ok: false, error: "empty_excerpt" };
  }

  const authUid = await resolveReportAuthUid({
    nickname: input.reporterNickname,
    color: input.reporterColor,
    uid: input.reporterUid,
  });

  const local = loadLocalReports();
  const duplicate = local.find((r) => {
    if (r.status !== "open") return false;
    const sameReporter =
      (authUid && r.reporterUid === authUid) ||
      r.reporterNickname.toLowerCase() ===
        input.reporterNickname.toLowerCase();
    if (!sameReporter) return false;
    const withinHour =
      Date.now() - new Date(r.createdAt).getTime() < 60 * 60 * 1000;
    if (!withinHour) return false;
    if (
      input.messageId &&
      r.messageId &&
      r.messageId === input.messageId
    ) {
      return true;
    }
    if (
      input.roomId === "help" &&
      r.roomId === "help" &&
      r.messageExcerpt === excerpt
    ) {
      return true;
    }
    return false;
  });
  if (duplicate) {
    return { ok: false, error: "already_reported" };
  }

  const reporterUid =
    authUid || input.reporterUid?.trim() || input.reporterNickname;

  const base: Omit<ChatReport, "id"> = {
    createdAt: new Date().toISOString(),
    reporterUid,
    reporterNickname: input.reporterNickname,
    reportedNickname: input.reportedNickname,
    roomId: input.roomId,
    roomName: input.roomName,
    messageId: input.messageId,
    messageExcerpt: excerpt,
    reason,
    status: "open",
  };

  if (supabase && authUid) {
    const { data: rpcId, error: rpcError } = await supabase.rpc(
      "submit_chat_report",
      {
        p_reporter_nickname: input.reporterNickname,
        p_reported_nickname: input.reportedNickname,
        p_room_id: input.roomId,
        p_room_name: input.roomName ?? null,
        p_message_id: input.messageId ?? null,
        p_message_excerpt: excerpt,
        p_reason: reason ?? null,
      },
    );

    if (!rpcError && rpcId === null) {
      return { ok: false, error: "already_reported" };
    }

    if (!rpcError && rpcId) {
      const persisted =
        (await fetchOwnReportById(String(rpcId))) ||
        ({ ...base, id: String(rpcId) } satisfies ChatReport);
      saveLocalReports([persisted, ...local]);
      return { ok: true, report: persisted };
    }

    if (rpcError && !rpcError.message.includes("does not exist")) {
      console.warn("[Reports] RPC submit failed:", rpcError.message);
    }

    const row = {
      reporter_uid: authUid,
      reporter_nickname: input.reporterNickname,
      reported_nickname: input.reportedNickname,
      room_id: input.roomId,
      room_name: input.roomName ?? null,
      message_id: input.messageId ?? null,
      message_excerpt: excerpt,
      reason: reason ?? null,
      status: "open" as const,
    };

    const { data, error } = await supabase
      .from("chat_reports")
      .insert([row])
      .select("*")
      .single();

    if (!error && data) {
      const report = mapRow(data as Record<string, unknown>);
      saveLocalReports([report, ...local]);
      return { ok: true, report };
    }

    if (error) {
      console.warn("[Reports] Direct insert failed:", error.message);
    }
  }

  const report: ChatReport = {
    ...base,
    id: `local-report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  saveLocalReports([report, ...local]);
  return { ok: true, report };
}

export async function updateChatReportStatus(
  reportId: string,
  status: ChatReportStatus,
  resolvedBy: string,
): Promise<boolean> {
  const patch = {
    status,
    resolvedBy,
    resolvedAt: new Date().toISOString(),
  };

  if (supabase && isPersistedReportId(reportId)) {
    const { error } = await supabase
      .from("chat_reports")
      .update({
        status,
        resolved_by: resolvedBy,
        resolved_at: patch.resolvedAt,
      })
      .eq("id", reportId);
    if (error) {
      console.warn("[Reports] Remote update failed:", error.message);
      return false;
    }
  }

  const local = loadLocalReports();
  const idx = local.findIndex((r) => r.id === reportId);
  if (idx >= 0) {
    local[idx] = { ...local[idx]!, ...patch };
    saveLocalReports(local);
  }

  if (supabase) {
    await syncChatReportsForStaff();
  }
  return true;
}

export function subscribeToChatReports(
  onChange: () => void,
): () => void {
  if (!supabase) return () => {};
  const client = supabase;

  const channel = client
    .channel(`chat_reports:${Date.now()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "chat_reports" },
      () => {
        void syncChatReportsForStaff().then(() => onChange());
      },
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
