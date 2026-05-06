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

// Featured medal change pubsub (cross-component reactivity)
type FeaturedListener = () => void;
const featuredListeners = new Set<FeaturedListener>();

export function onFeaturedMedalChanged(fn: FeaturedListener) {
  featuredListeners.add(fn);
  return () => { featuredListeners.delete(fn); };
}

export function emitFeaturedMedalChanged() {
  featuredListeners.forEach((fn) => fn());
}
