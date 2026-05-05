import type { NewMedal } from "@/lib/dailyChallenge";

type Listener = (medals: NewMedal[]) => void;
let listener: Listener | null = null;

export function onMedalEarned(fn: Listener) {
  listener = fn;
  return () => { listener = null; };
}

export function emitMedalsEarned(medals: NewMedal[]) {
  if (medals && medals.length) listener?.(medals);
}
