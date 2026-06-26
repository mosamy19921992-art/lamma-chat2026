import { useEffect, useState } from "react";
import { startTabLeaderElection } from "../services/chat/tabLeaderService";

/** True when this tab owns PM/call/notification realtime (single tab per profile). */
export function useTabLeader(): boolean {
  const [isLeader, setIsLeader] = useState(true);

  useEffect(() => startTabLeaderElection(setIsLeader), []);

  return isLeader;
}

export default useTabLeader;
