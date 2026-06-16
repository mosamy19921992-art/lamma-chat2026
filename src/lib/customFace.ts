// Custom Face engine — lets the owner build a full custom "look" for the chat
// (colors, glow, frame, column backgrounds, message bubbles, typography, and
// border radius) and apply it live without touching code. The face is applied
// by writing CSS variables + a `data-custom-face="on"` flag onto the live chat
// root (`.lamma-neutral-glass`).
//
// The matching CSS overrides live in `index.css` under
// `.lamma-neutral-glass[data-custom-face="on"]`. When the face is disabled the
// shipped neutral/golden design is used exactly as before.

export interface CustomFace {
  enabled: boolean;
  // Core palette
  primary: string;
  accent: string;
  text: string;
  frame: string;
  // Glow
  glow: string;
  glowStrength: number;
  // App + column backgrounds
  appBg: string;
  appBgImage: string;
  leftColor: string;
  leftImage: string;
  centerColor: string;
  centerImage: string;
  rightColor: string;
  rightImage: string;
  // Message bubbles
  ownMsgBg: string;
  ownMsgBorder: string;
  otherMsgBg: string;
  otherMsgBorder: string;
  // Typography
  fontFamily: string;
  // Shape
  bubbleRadius: number;
}

export interface SavedFace {
  id: string;
  name: string;
  createdAt: string;
  face: CustomFace;
}

export const CURRENT_FACE_KEY = "lamma_custom_face";
export const SAVED_FACES_KEY = "lamma_custom_faces";

export const DEFAULT_FACE: CustomFace = {
  enabled: false,
  primary: "#d4a63a",
  accent: "#f7e7b4",
  text: "#ffffff",
  frame: "#d6b35b",
  glow: "#d4a63a",
  glowStrength: 14,
  appBg: "#070b10",
  appBgImage: "",
  leftColor: "#0d1320",
  leftImage: "",
  centerColor: "#0a0f16",
  centerImage: "",
  rightColor: "#0d1320",
  rightImage: "",
  ownMsgBg: "rgba(218,165,32,0.32)",
  ownMsgBorder: "rgba(255,215,0,0.72)",
  otherMsgBg: "rgba(22,18,14,0.88)",
  otherMsgBorder: "rgba(218,165,32,0.22)",
  fontFamily: "Cairo",
  bubbleRadius: 14,
};

// ─── Built-in Presets ────────────────────────────────────────────────────────

export interface FacePreset {
  id: string;
  name: string;
  emoji: string;
  face: CustomFace;
}

export const FACE_PRESETS: FacePreset[] = [
  {
    id: "gold",
    name: "الذهب الكلاسيكي",
    emoji: "🟡",
    face: { ...DEFAULT_FACE, enabled: true },
  },
  {
    id: "ocean",
    name: "البحر الهادئ",
    emoji: "🔵",
    face: {
      ...DEFAULT_FACE,
      enabled: true,
      primary: "#0ea5e9",
      accent: "#bae6fd",
      text: "#f0f9ff",
      frame: "#38bdf8",
      glow: "#0ea5e9",
      glowStrength: 18,
      appBg: "#060d18",
      leftColor: "#070f1e",
      centerColor: "#05080f",
      rightColor: "#070f1e",
      ownMsgBg: "rgba(14,165,233,0.30)",
      ownMsgBorder: "rgba(56,189,248,0.70)",
      otherMsgBg: "rgba(7,15,30,0.90)",
      otherMsgBorder: "rgba(14,165,233,0.25)",
      fontFamily: "Cairo",
      bubbleRadius: 16,
    },
  },
  {
    id: "violet",
    name: "الغروب البنفسجي",
    emoji: "🟣",
    face: {
      ...DEFAULT_FACE,
      enabled: true,
      primary: "#a855f7",
      accent: "#e9d5ff",
      text: "#faf5ff",
      frame: "#c084fc",
      glow: "#a855f7",
      glowStrength: 20,
      appBg: "#0a060f",
      leftColor: "#100820",
      centerColor: "#0d0618",
      rightColor: "#100820",
      ownMsgBg: "rgba(168,85,247,0.28)",
      ownMsgBorder: "rgba(192,132,252,0.65)",
      otherMsgBg: "rgba(16,8,32,0.90)",
      otherMsgBorder: "rgba(168,85,247,0.22)",
      fontFamily: "Cairo",
      bubbleRadius: 18,
    },
  },
  {
    id: "silver",
    name: "الفضة المعدنية",
    emoji: "⚪",
    face: {
      ...DEFAULT_FACE,
      enabled: true,
      primary: "#94a3b8",
      accent: "#e2e8f0",
      text: "#f8fafc",
      frame: "#cbd5e1",
      glow: "#94a3b8",
      glowStrength: 10,
      appBg: "#080a0c",
      leftColor: "#0e1015",
      centerColor: "#0a0c10",
      rightColor: "#0e1015",
      ownMsgBg: "rgba(148,163,184,0.22)",
      ownMsgBorder: "rgba(203,213,225,0.55)",
      otherMsgBg: "rgba(14,16,21,0.92)",
      otherMsgBorder: "rgba(148,163,184,0.20)",
      fontFamily: "Space Grotesk",
      bubbleRadius: 12,
    },
  },
  {
    id: "fire",
    name: "جمر النار",
    emoji: "🔴",
    face: {
      ...DEFAULT_FACE,
      enabled: true,
      primary: "#ef4444",
      accent: "#fca5a5",
      text: "#fff1f2",
      frame: "#f87171",
      glow: "#ef4444",
      glowStrength: 22,
      appBg: "#0f0505",
      leftColor: "#1a0808",
      centerColor: "#150606",
      rightColor: "#1a0808",
      ownMsgBg: "rgba(239,68,68,0.28)",
      ownMsgBorder: "rgba(248,113,113,0.65)",
      otherMsgBg: "rgba(26,8,8,0.92)",
      otherMsgBorder: "rgba(239,68,68,0.22)",
      fontFamily: "Cairo",
      bubbleRadius: 14,
    },
  },
  {
    id: "forest",
    name: "حديقة الليل",
    emoji: "🟢",
    face: {
      ...DEFAULT_FACE,
      enabled: true,
      primary: "#22c55e",
      accent: "#bbf7d0",
      text: "#f0fdf4",
      frame: "#4ade80",
      glow: "#22c55e",
      glowStrength: 16,
      appBg: "#030a05",
      leftColor: "#060f08",
      centerColor: "#040c06",
      rightColor: "#060f08",
      ownMsgBg: "rgba(34,197,94,0.25)",
      ownMsgBorder: "rgba(74,222,128,0.60)",
      otherMsgBg: "rgba(6,15,8,0.92)",
      otherMsgBorder: "rgba(34,197,94,0.22)",
      fontFamily: "Tajawal",
      bubbleRadius: 16,
    },
  },
  {
    id: "rose",
    name: "وردي ناعم",
    emoji: "🩷",
    face: {
      ...DEFAULT_FACE,
      enabled: true,
      primary: "#ec4899",
      accent: "#fbcfe8",
      text: "#fff0f6",
      frame: "#f472b6",
      glow: "#ec4899",
      glowStrength: 18,
      appBg: "#0f0509",
      leftColor: "#1a0810",
      centerColor: "#15060d",
      rightColor: "#1a0810",
      ownMsgBg: "rgba(236,72,153,0.26)",
      ownMsgBorder: "rgba(244,114,182,0.62)",
      otherMsgBg: "rgba(26,8,16,0.92)",
      otherMsgBorder: "rgba(236,72,153,0.22)",
      fontFamily: "Cairo",
      bubbleRadius: 20,
    },
  },
  {
    id: "void",
    name: "الكون الأسود",
    emoji: "⚫",
    face: {
      ...DEFAULT_FACE,
      enabled: true,
      primary: "#6366f1",
      accent: "#c7d2fe",
      text: "#f8fafc",
      frame: "#818cf8",
      glow: "#6366f1",
      glowStrength: 12,
      appBg: "#020204",
      leftColor: "#050507",
      centerColor: "#030305",
      rightColor: "#050507",
      ownMsgBg: "rgba(99,102,241,0.24)",
      ownMsgBorder: "rgba(129,140,248,0.58)",
      otherMsgBg: "rgba(5,5,7,0.95)",
      otherMsgBorder: "rgba(99,102,241,0.20)",
      fontFamily: "Space Grotesk",
      bubbleRadius: 10,
    },
  },
  {
    id: "geometric",
    name: "الوجه الهندسي",
    emoji: "📐",
    face: {
      ...DEFAULT_FACE,
      enabled: true,
      primary: "#64748b",
      accent: "#cbd5e1",
      text: "#f1f5f9",
      frame: "#475569",
      glow: "#38bdf8",
      glowStrength: 9,
      appBg: "#0b0f14",
      appBgImage: "",
      leftColor: "#111820",
      leftImage: "",
      centerColor: "#0a0e12",
      centerImage: "",
      rightColor: "#111820",
      rightImage: "",
      ownMsgBg: "rgba(56,189,248,0.16)",
      ownMsgBorder: "rgba(148,163,184,0.62)",
      otherMsgBg: "rgba(12,17,24,0.94)",
      otherMsgBorder: "rgba(100,116,139,0.38)",
      fontFamily: "Space Grotesk",
      bubbleRadius: 6,
    },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeHex(value: string): string {
  const raw = (value || "").replace("#", "").trim();
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  return full.length === 6 ? `#${full.toLowerCase()}` : "#000000";
}

export function hexToRgb(value: string): string {
  const hex = normalizeHex(value).slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return "212, 166, 58";
  return `${r}, ${g}, ${b}`;
}

function bgValue(color: string, image: string): string {
  const url = (image || "").trim();
  if (url) {
    return `center / cover no-repeat url("${url.replace(/"/g, '\\"')}")`;
  }
  return color || "transparent";
}

function getChatRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(".lamma-neutral-glass");
}

// ─── Persistence ─────────────────────────────────────────────────────────────

export function loadFace(): CustomFace {
  if (typeof localStorage === "undefined") return { ...DEFAULT_FACE };
  try {
    const raw = localStorage.getItem(CURRENT_FACE_KEY);
    if (!raw) return { ...DEFAULT_FACE };
    const parsed = JSON.parse(raw) as Partial<CustomFace>;
    return { ...DEFAULT_FACE, ...parsed };
  } catch {
    return { ...DEFAULT_FACE };
  }
}

export function saveFace(face: CustomFace): void {
  try {
    localStorage.setItem(CURRENT_FACE_KEY, JSON.stringify(face));
  } catch {
    // ignore quota / serialization errors
  }
}

export function loadSavedFaces(): SavedFace[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_FACES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedFace[]) : [];
  } catch {
    return [];
  }
}

export function persistSavedFaces(list: SavedFace[]): void {
  try {
    localStorage.setItem(SAVED_FACES_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

// ─── Apply ───────────────────────────────────────────────────────────────────

export function applyFace(face: CustomFace): boolean {
  const root = getChatRoot();
  if (!root) return false;

  if (!face.enabled) {
    root.dataset.customFace = "off";
    root.dataset.faceStyle = "soft";
    return true;
  }

  const [fr, fg, fb] = hexToRgb(face.frame).split(",").map((p) => p.trim());

  // Core palette
  root.style.setProperty("--face-primary", normalizeHex(face.primary));
  root.style.setProperty("--face-primary-rgb", hexToRgb(face.primary));
  root.style.setProperty("--face-accent", normalizeHex(face.accent));
  root.style.setProperty("--face-accent-rgb", hexToRgb(face.accent));
  root.style.setProperty("--face-text", normalizeHex(face.text));
  root.style.setProperty("--face-frame-r", fr ?? "214");
  root.style.setProperty("--face-frame-g", fg ?? "179");
  root.style.setProperty("--face-frame-b", fb ?? "91");

  // Glow
  root.style.setProperty("--face-glow-rgb", hexToRgb(face.glow));
  root.style.setProperty(
    "--face-glow-strength",
    String(Math.max(0, Math.min(100, face.glowStrength)) / 100),
  );

  // Backgrounds
  root.style.setProperty("--face-app-bg", bgValue(face.appBg, face.appBgImage));
  root.style.setProperty("--face-col-left", bgValue(face.leftColor, face.leftImage));
  root.style.setProperty("--face-col-center", bgValue(face.centerColor, face.centerImage));
  root.style.setProperty("--face-col-right", bgValue(face.rightColor, face.rightImage));

  // Message bubbles
  root.style.setProperty("--face-own-bg", face.ownMsgBg);
  root.style.setProperty("--face-own-border", face.ownMsgBorder);
  root.style.setProperty("--face-other-bg", face.otherMsgBg);
  root.style.setProperty("--face-other-border", face.otherMsgBorder);

  // Typography + shape
  root.style.setProperty("--face-font", face.fontFamily);
  root.style.setProperty("--face-bubble-radius", `${Math.max(0, Math.min(32, face.bubbleRadius))}px`);

  root.dataset.customFace = "on";
  root.dataset.faceStyle = face.bubbleRadius <= 8 ? "geometric" : "soft";
  return true;
}

// Re-apply the stored face after a reload, retrying briefly until the chat
// root element is mounted in the DOM.
export function ensureFaceApplied(attempt = 0): void {
  if (typeof window === "undefined") return;
  const ok = applyFace(loadFace());
  if (!ok && attempt < 20) {
    window.requestAnimationFrame(() => ensureFaceApplied(attempt + 1));
  }
}
