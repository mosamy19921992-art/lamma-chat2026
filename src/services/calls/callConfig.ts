export interface IceServerBundle {
  name: string;
  iceServers: RTCIceServer[];
}

/** Primary + fallback ICE/TURN bundles — browser tries all servers in a bundle; on failure we switch bundle. */
export function getIceServerBundles(): IceServerBundle[] {
  const primary: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    // Free public TURN relay — improves connectivity behind strict NAT
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ];
  const fallback: RTCIceServer[] = [
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:stun.nextcloud.com:443" },
    {
      urls: [
        "turn:openrelay.metered.ca:80?transport=tcp",
        "turn:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ];

  const turn1 = import.meta.env.VITE_TURN_URL as string | undefined;
  if (turn1) {
    primary.push({
      urls: turn1,
      username: (import.meta.env.VITE_TURN_USERNAME as string) || "",
      credential: (import.meta.env.VITE_TURN_CREDENTIAL as string) || "",
    });
  }

  const turn2 = import.meta.env.VITE_TURN_URL_2 as string | undefined;
  if (turn2) {
    fallback.push({
      urls: turn2,
      username: (import.meta.env.VITE_TURN_USERNAME_2 as string) || "",
      credential: (import.meta.env.VITE_TURN_CREDENTIAL_2 as string) || "",
    });
  }

  return [
    { name: "Google STUN" + (turn1 ? " + TURN-1" : ""), iceServers: primary },
    {
      name: "Cloudflare STUN" + (turn2 ? " + TURN-2" : ""),
      iceServers: fallback,
    },
  ];
}

export const CALL_RING_TIMEOUT_MS = 45_000;
export const ICE_FAILOVER_DELAY_MS = 4_000;
