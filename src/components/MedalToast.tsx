import { useEffect, useState } from "react";
import MedalEarnedPopup from "./MedalEarnedPopup";
import { onMedalEarned } from "@/lib/medalEvents";
import type { NewMedal } from "@/lib/dailyChallenge";

export default function MedalToast() {
  const [queue, setQueue] = useState<NewMedal[]>([]);
  useEffect(() => onMedalEarned((medals) => setQueue((q) => [...q, ...medals])), []);
  if (queue.length === 0) return null;
  const m = queue[0];
  return (
    <MedalEarnedPopup
      medal={m}
      xpReward={m.xp_earned ?? 0}
      onClose={() => setQueue((q) => q.slice(1))}
    />
  );
}
