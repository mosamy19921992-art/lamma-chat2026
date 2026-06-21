export interface IceServerBundle {
  name: string;
  iceServers: RTCIceServer[];
}

const PUBLIC_TURN_RELAY: RTCIceServer = {
  urls: [
    "turn:openrelay.metered.ca:80",
    "turn:openrelay.metered.ca:443",
    "turn:openrelay.metered.ca:443?transport=tcp",
  ],
  username: "openrelayproject",
  credential: "openrelayproject",
};

const PUBLIC_TURN_TCP: RTCIceServer = {
  urls: [
    "turn:openrelay.metered.ca:80?transport=tcp",
    "turn:openrelay.metered.ca:443?transport=tcp",
  ],
  username: "openrelayproject",
  credential: "openrelayproject",
};

function readEnvTurn(
  urlKey: string,
  userKey: string,
  credKey: string,
): RTCIceServer | null {
  const urls = (import.meta.env[urlKey] as string | undefined)?.trim();
  if (!urls) return null;
  return {
    urls,
    username: ((import.meta.env[userKey] as string | undefined) || "").trim(),
    credential: ((import.meta.env[credKey] as string | undefined) || "").trim(),
  };
}

/** Primary + fallback ICE/TURN bundles — browser tries all servers in a bundle; on failure we switch bundle. */
export function getIceServerBundles(): IceServerBundle[] {
  const prodTurn1 = readEnvTurn(
    "VITE_TURN_URL",
    "VITE_TURN_USERNAME",
    "VITE_TURN_CREDENTIAL",
  );
  const prodTurn2 = readEnvTurn(
    "VITE_TURN_URL_2",
    "VITE_TURN_USERNAME_2",
    "VITE_TURN_CREDENTIAL_2",
  );
  const hasProdTurn = Boolean(prodTurn1 || prodTurn2);

  const primary: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];
  if (prodTurn1) primary.push(prodTurn1);
  else if (!hasProdTurn) primary.push(PUBLIC_TURN_RELAY);

  const fallback: RTCIceServer[] = [
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:stun.nextcloud.com:443" },
  ];
  if (prodTurn2) fallback.push(prodTurn2);
  else if (!hasProdTurn) fallback.push(PUBLIC_TURN_TCP);

  return [
    {
      name: "Google STUN" + (prodTurn1 ? " + TURN-1" : hasProdTurn ? "" : " + relay"),
      iceServers: primary,
    },
    {
      name: "Cloudflare STUN" + (prodTurn2 ? " + TURN-2" : hasProdTurn ? "" : " + relay"),
      iceServers: fallback,
    },
  ];
}

export const CALL_RING_TIMEOUT_MS = 45_000;
export const ICE_FAILOVER_DELAY_MS = 4_000;
