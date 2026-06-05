import React from "react";

interface AMLogoProps {
  className?: string;
  size?: number;
  glow?: boolean;
  variant?: "calligraphy" | "circular";
  crownRole?: "owner" | "admin" | "vip" | "none";
  crown?: boolean; // legacy support
  frame?: string; // custom frame gradient classes
}

function parseTailwindColor(token: string): string {
  if (!token) return "transparent";
  const bracketMatch = token.match(/\[([^\]]+)\]/);
  if (bracketMatch) {
    return bracketMatch[1];
  }
  const colorMap: Record<string, string> = {
    "red-400": "#f87171",
    "red-500": "#ef4444",
    "red-600": "#dc2626",
    "orange-400": "#fb923c",
    "orange-500": "#f97316",
    "orange-600": "#ea580c",
    "yellow-400": "#facc15",
    "yellow-500": "#eab308",
    "yellow-600": "#ca8a04",
    "amber-550": "#ca8a04",
    "amber-500": "#f59e0b",
    "amber-600": "#d97706",
    "cyan-400": "#22d3ee",
    "cyan-500": "#06b6d4",
    "indigo-400": "#818cf8",
    "indigo-500": "#6366f1",
    "indigo-600": "#4f46e5",
    "purple-400": "#c084fc",
    "purple-500": "#a855f7",
    "purple-600": "#9333ea",
    "pink-400": "#f472b6",
    "pink-500": "#ec4899",
    "pink-600": "#db2777",
    "emerald-450": "#059669",
    "emerald-500": "#10b981",
    "green-450": "#10b981",
    "green-400": "#4ade80",
    "green-500": "#22c55e",
    "blue-400": "#60a5fa",
    "blue-500": "#3b82f6",
    "violet-500": "#8b5cf6",
    "fuchsia-500": "#d946ef",
    "rose-500": "#f43f5e",
    "transparent": "transparent",
  };
  const cleanToken = token.replace(/^(from-|via-|to-)/, "");
  return colorMap[cleanToken] || cleanToken || "#10b981";
}

export default function AMLogo({
  className = "",
  size,
  glow = true,
  variant = "calligraphy",
  crownRole = "none",
  crown = false,
  frame = "",
}: AMLogoProps) {
  // Standard defaults based on variant
  const defaultSize = variant === "circular" ? 90 : 130;
  const finalSize = size || defaultSize;

  const showCrown = crown || crownRole !== "none";
  let crownGradientId = "crownGold";
  if (crownRole === "admin") crownGradientId = "crownRed";
  else if (crownRole === "vip") crownGradientId = "crownBlue";

  // Parse colors from custom raw style frame classes
  const gradientInfo = React.useMemo(() => {
    if (!frame) return null;
    const parts = frame.split(/\s+/);
    let fromColor = "";
    let viaColor = "";
    let toColor = "";
    parts.forEach(part => {
      if (part.startsWith("from-")) fromColor = parseTailwindColor(part);
      else if (part.startsWith("via-")) viaColor = parseTailwindColor(part);
      else if (part.startsWith("to-")) toColor = parseTailwindColor(part);
    });
    if (!fromColor && toColor) fromColor = toColor;
    if (!toColor && fromColor) toColor = fromColor;
    if (!fromColor) return null;
    return { fromColor, viaColor, toColor };
  }, [frame]);

  const uniqueId = React.useId ? React.useId().replace(/:/g, "") : Math.floor(Math.random() * 1000000);
  const userFrameGradId = `userFrameGrad-${uniqueId}`;

  if (variant === "circular") {
    return (
      <div
        className={`relative select-none flex items-center justify-center ${className}`}
        style={{ width: finalSize, height: finalSize }}
      >
        <svg
          viewBox="0 0 200 200"
          width="100%"
          height="100%"
          className="overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Round glow radial gradient */}
            <radialGradient id="roundGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#059669" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#022c22" stopOpacity="0" />
            </radialGradient>

            {/* Glowing gold for owner crown */}
            <linearGradient id="crownGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>

            {/* Glowing Red for admin crown */}
            <linearGradient id="crownRed" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>

            {/* Glowing Blue for vip crown */}
            <linearGradient id="crownBlue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            {/* Neon green stroke blur */}
            <filter id="neonRingBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Custom VIP/Avatar Dynamic Frame Gradient */}
            {gradientInfo && (
              <linearGradient id={userFrameGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={gradientInfo.fromColor} />
                {gradientInfo.viaColor && <stop offset="50%" stopColor={gradientInfo.viaColor} />}
                <stop offset="100%" stopColor={gradientInfo.toColor} />
              </linearGradient>
            )}
          </defs>

          {/* Ambient radial glow background */}
          {glow && (
            <circle
              cx="100"
              cy="110"
              r="75"
              fill={gradientInfo ? `url(#${userFrameGradId})` : "url(#roundGlow)"}
              opacity={gradientInfo ? 0.12 : 1}
              className="animate-pulse duration-[3000ms]"
            />
          )}

          {/* Premium Golden Crown above the circle (if requested/enabled) */}
          {showCrown && (
            <g transform="translate(10, 5)" className="relative z-30">
              {/* Crown Base */}
              <path
                d="M 65 52 L 115 52 L 123 35 L 105 44 L 90 22 L 75 44 L 57 35 Z"
                fill={`url(#${crownGradientId})`}
                stroke={crownRole === "admin" ? "#fca5a5" : crownRole === "vip" ? "#93c5fd" : "#fef08a"}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              {/* Crown gems */}
              <circle cx="90" cy="22" r="2.5" fill="#ffffff" />
              <circle cx="57" cy="35" r="2" fill="#ffffff" />
              <circle cx="123" cy="35" r="2" fill="#ffffff" />
              <circle cx="90" cy="45" r="2" fill={crownRole === "admin" ? "#ffffff" : "#ef4444"} />
              {/* Soft glow behind the crown */}
              <path
                d="M 65 52 L 115 52 L 123 35 L 105 44 L 90 22 L 75 44 L 57 35 Z"
                fill={crownRole === "admin" ? "#ef4444" : crownRole === "vip" ? "#3b82f6" : "#eab308"}
                opacity="0.25"
                filter="url(#neonRingBlur)"
              />
            </g>
          )}

          {/* Main glowing green double-ring badge */}
          <g filter="url(#neonRingBlur)" className="relative z-10">
            {/* Outer Ring */}
            <circle
              cx="100"
              cy="110"
              r="52"
              stroke={gradientInfo ? `url(#${userFrameGradId})` : "#10b981"}
              strokeWidth={gradientInfo ? "4.5" : "3.2"}
              strokeOpacity="0.95"
              className={gradientInfo ? "animate-pulse" : ""}
            />
            {/* Inner dashed ring */}
            <circle
              cx="100"
              cy="110"
              r="44"
              stroke={gradientInfo ? `url(#${userFrameGradId})` : "#34d399"}
              strokeWidth="1.2"
              strokeDasharray="4 3"
              strokeOpacity="0.7"
            />
          </g>

          {/* Center Text "A.M" exactly matching the mockup */}
          <text
            x="100"
            y="126"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="41"
            fontWeight="900"
            fontFamily="'Cinzel', 'Playfair Display', 'Times New Roman', serif"
            style={{
              textShadow: "0 0 12px rgba(16, 185, 129, 0.95), 0 0 4px rgba(255, 255, 255, 0.5)",
              letterSpacing: "-0.5px",
            }}
          >
            A.M
          </text>
        </svg>
      </div>
    );
  }

  // Calligraphy variant
  return (
    <div
      className={`relative select-none flex items-center justify-center ${className}`}
      style={{ width: finalSize, height: finalSize }}
    >
      <svg
        viewBox="0 0 200 200"
        width="100%"
        height="100%"
        className="overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Intense Magical Emerald/Forest Radial Glow */}
          <radialGradient id="auroraGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.45" />
            <stop offset="30%" stopColor="#059669" stopOpacity="0.25" />
            <stop offset="70%" stopColor="#064e3b" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#022c22" stopOpacity="0" />
          </radialGradient>

          {/* Premium Calligraphic Emerald-to-Gold Gradient */}
          <linearGradient id="goldGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="25%" stopColor="#a3e635" />
            <stop offset="60%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* Golden Green Highlight Gradient */}
          <linearGradient id="glowAccent" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="50%" stopColor="#a3e635" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          {/* Neon Gaussian Blurs for intense visual depth */}
          <filter id="neonBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur1" />
            <feGaussianBlur stdDeviation="14" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
            </feMerge>
          </filter>

          {/* Core high-contrast outline glow filter */}
          <filter id="coreGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.06   0 0 0 0 0.83   0 0 0 0 0.41  0 0 0 0.95 0"
            />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient background glow circle matching the mockup "aurora" vibe */}
        {glow && (
          <circle
            cx="100"
            cy="100"
            r="85"
            fill="url(#auroraGlow)"
              className="animate-pulse duration-[5200ms]"
          />
        )}

        {/* ================= BACKGROUND GLOW SHAPES ================= */}
        {glow && (
          <g filter="url(#neonBlur)" opacity="0.8">
            {/* The main calligraphic loop of "A" & "M" */}
            <path
              d="M 52 144 C 34 144, 20 112, 38 78 C 56 44, 98 22, 118 22 C 132 22, 128 42, 112 66 C 96 90, 72 132, 68 144 C 64 156, 50 156, 44 144 C 38 132, 64 100, 84 78 C 104 56, 134 32, 150 32 C 166 32, 170 48, 154 74 C 138 100, 108 154, 138 154 C 154 154, 168 128, 178 112"
              stroke="#059669"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 38 105 C 68 105, 100 92, 122 76 C 136 64, 146 48, 124 54 C 102 60, 75 96, 102 112 C 118 122, 138 114, 154 94"
              stroke="#10b981"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* ================= FLOATING SPARKLES (MATCHES THE IMAGE BEAUTIFULLY) ================= */}
        {glow && (
          <g opacity="0.72">
            {/* Sparkle 1 */}
            <path
              d="M 42 45 L 45 48 L 42 51 L 39 48 Z"
              fill="#a3e635"
              className="animate-pulse"
              style={{ transformOrigin: "42px 48px", animationDuration: "4.6s" }}
            />
            {/* Sparkle 2 */}
            <path
              d="M 165 135 L 167 137 L 165 139 L 163 137 Z"
              fill="#fef08a"
              className="animate-pulse"
              style={{ transformOrigin: "165px 137px", animationDuration: "4s" }}
            />
            {/* Sparkle 3 */}
            <path
              d="M 148 40 L 151 43 L 148 46 L 145 43 Z"
              fill="#ffffff"
              className="animate-pulse"
              style={{ transformOrigin: "148px 43px", animationDuration: "3.6s" }}
            />
          </g>
        )}

        {/* ================= MAIN SHARP CALLIGRAPHY OVERLAY ================= */}
        <g filter="url(#coreGlow)">
          {/* Main calligraphic overlapping ribbon representing English copperplate "AM" Monogram */}
          <path
            d="M 52 144 C 34 144, 20 112, 38 78 C 56 44, 98 22, 118 22 C 132 22, 128 42, 112 66 C 96 90, 72 132, 68 144 C 64 156, 50 156, 44 144 C 38 132, 64 100, 84 78 C 104 56, 134 32, 150 32 C 166 32, 170 48, 154 74 C 138 100, 108 154, 138 154 C 154 154, 168 128, 178 112"
            stroke="url(#goldGreenGrad)"
            strokeWidth="5.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Second overlapping interlocking swoosh */}
          <path
            d="M 38 105 C 68 105, 100 92, 122 76 C 136 64, 146 48, 124 54 C 102 60, 75 96, 102 112 C 118 122, 138 114, 154 94"
            stroke="url(#glowAccent)"
            strokeWidth="3.4"
            strokeLinecap="round"
          />

          {/* Flourish highlight terminal dots */}
          <circle cx="178" cy="112" r="3" fill="#ffffff" />
          <circle cx="118" cy="22" r="3" fill="#fef08a" />
          <circle cx="38" cy="105" r="2.5" fill="#a2e635" />
        </g>
      </svg>
    </div>
  );
}
