import { useEffect, useState } from "react";
import MedalEarnedPopup from "./MedalEarnedPopup";
import { onMedalEarned } from "@/lib/medalEvents";
import type { NewMedal } from "@/lib/dailyChallenge";

export default function MedalToast() {
  const [queue, setQueue] = useState<NewMedal[]>([]);
  useEffect(() => onMedalEarned((medals) => setQueue((q) => [...q, ...medals])), []);
  if (queue.length === 0) return null;
  return (
    <MedalEarnedPopup
      medal={queue[0]}
      xpReward={0}
      onClose={() => setQueue((q) => q.slice(1))}
    />
  );
}
