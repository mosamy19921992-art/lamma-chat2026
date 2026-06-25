export interface IceServerBundle {
  name: string;
  iceServers: RTCIceServer[];
}

/** Shared free relay — ~50 GB/month, good for small/medium apps without payment. */
const PUBLIC_TURN_RELAY: RTCIceServer = {
  urls: [
    "turn:openrelay.metered.ca:80",
    "turn:openrelay.metered.ca:443",
    "turn:openrelay.metered.ca:443?transport=tcp",
    "turns:openrelay.metered.ca:443?transport=tcp",
  ],
  username: "openrelayproject",
  credential: "openrelayproject",
};

const PUBLIC_TURN_TCP: RTCIceServer = {
  urls: [
    "turn:openrelay.metered.ca:80?transport=tcp",
    "turn:openrelay.metered.ca:443?transport=tcp",
    "turns:openrelay.metered.ca:443?transport=tcp",
  ],
  username: "openrelayproject",
  credential: "openrelayproject",
};

/** More STUN = higher chance of direct P2P (best quality, zero relay cost). */
const PRIMARY_STUN: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
];

const FALLBACK_STUN: RTCIceServer[] = [
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:stun.services.mozilla.com:3478" },
  { urls: "stun:stun.nextcloud.com:443" },
  { urls: "stun:stun.voip.blackberry.com:3478" },
];

function parseTurnUrls(raw: string): string | string[] {
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return raw.trim();
  return parts.length === 1 ? parts[0]! : parts;
}

function readEnvTurn(
  urlKey: string,
  userKey: string,
  credKey: string,
): RTCIceServer | null {
  const raw = (import.meta.env[urlKey] as string | undefined)?.trim();
  if (!raw) return null;
  return {
    urls: parseTurnUrls(raw),
    username: ((import.meta.env[userKey] as string | undefined) || "").trim(),
    credential: ((import.meta.env[credKey] as string | undefined) || "").trim(),
  };
}

function isOpenRelayTurn(server: RTCIceServer | null): boolean {
  if (!server) return false;
  const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
  return urls.some((u) => String(u).includes("openrelay.metered.ca"));
}

/** Primary + fallback ICE/TURN bundles — browser tries all servers in a bundle; on failure we switch bundle. */
export function getIceServerBundles(): IceServerBundle[] {
  const envTurn1 = readEnvTurn(
    "VITE_TURN_URL",
    "VITE_TURN_USERNAME",
    "VITE_TURN_CREDENTIAL",
  );
  const envTurn2 = readEnvTurn(
    "VITE_TURN_URL_2",
    "VITE_TURN_USERNAME_2",
    "VITE_TURN_CREDENTIAL_2",
  );
  const hasCustomTurn =
    Boolean(envTurn1 && !isOpenRelayTurn(envTurn1)) ||
    Boolean(envTurn2 && !isOpenRelayTurn(envTurn2));

  const primaryStun = hasCustomTurn
    ? [{ urls: "stun:stun.l.google.com:19302" }]
    : PRIMARY_STUN;
  const fallbackStun = hasCustomTurn
    ? [{ urls: "stun:stun.cloudflare.com:3478" }]
    : FALLBACK_STUN;

  const primary: RTCIceServer[] = [...primaryStun];
  if (envTurn1) primary.push(envTurn1);
  if (!hasCustomTurn || !envTurn1 || !isOpenRelayTurn(envTurn1)) {
    primary.push(PUBLIC_TURN_RELAY);
  }

  const fallback: RTCIceServer[] = [...fallbackStun];
  if (envTurn2) fallback.push(envTurn2);
  else if (envTurn1 && hasCustomTurn) fallback.push(envTurn1);
  if (!hasCustomTurn || !envTurn2 || !isOpenRelayTurn(envTurn2)) {
    fallback.push(PUBLIC_TURN_TCP);
  }

  const turn1Label = envTurn1
    ? isOpenRelayTurn(envTurn1)
      ? " + relay مجاني"
      : " + TURN-1"
    : " + relay مجاني";

  return [
    {
      name: "Google STUN" + turn1Label,
      iceServers: primary,
    },
    {
      name:
        "Cloudflare STUN" +
        (envTurn2
          ? isOpenRelayTurn(envTurn2)
            ? " + relay TCP"
            : " + TURN-2"
          : hasCustomTurn
            ? ""
            : " + relay TCP"),
      iceServers: fallback,
    },
  ];
}

/** Faster ICE gathering on call start (free — no paid service). */
export const ICE_CANDIDATE_POOL_SIZE = 12;

export const CALL_RING_TIMEOUT_MS = 45_000;
/** Fail over to 2nd bundle sooner when relay is congested. */
export const ICE_FAILOVER_DELAY_MS = 2_500;
