import type { NewMedal } from "@/lib/dailyChallenge";

export interface MedalDef extends NewMedal {
  /** Optional progress hint for locked state, returns { current, total, label } */
  progressHint?: { label: string; total: number };
}

export const ALL_MEDALS: MedalDef[] = [
  { medal_id: "FIRST_GENERATE", medal_name: "Langkah Pertama", medal_tier: "bronze", medal_description: "Membuat program pertama bersama Coach Surya", progressHint: { label: "0/1 program", total: 1 } },
  { medal_id: "DAILY_1",  medal_name: "Pejuang Pertama",   medal_tier: "bronze",  medal_description: "Menyelesaikan tantangan harian pertama", progressHint: { label: "0/1 tantangan", total: 1 } },
  { medal_id: "DAILY_7",  medal_name: "Petarung Mingguan", medal_tier: "silver",  medal_description: "Menyelesaikan 7 tantangan harian",       progressHint: { label: "0/7 tantangan", total: 7 } },
  { medal_id: "DAILY_30", medal_name: "Gladiator",         medal_tier: "gold",    medal_description: "Menyelesaikan 30 tantangan harian",      progressHint: { label: "0/30 tantangan", total: 30 } },
  { medal_id: "STREAK_3",  medal_name: "On Fire",            medal_tier: "bronze", medal_description: "Latihan 3 hari berturut-turut",  progressHint: { label: "0/3 hari streak", total: 3 } },
  { medal_id: "STREAK_7",  medal_name: "Minggu Penuh Api",   medal_tier: "silver", medal_description: "Latihan 7 hari berturut-turut",  progressHint: { label: "0/7 hari streak", total: 7 } },
  { medal_id: "STREAK_30", medal_name: "Unstoppable",        medal_tier: "gold",   medal_description: "Latihan 30 hari berturut-turut", progressHint: { label: "0/30 hari streak", total: 30 } },
  { medal_id: "PROGRAM_COMPLETE", medal_name: "Program Tamat", medal_tier: "silver", medal_description: "Menyelesaikan satu program penuh", progressHint: { label: "0/1 program", total: 1 } },
  { medal_id: "CHECKIN_14",  medal_name: "Konsisten",       medal_tier: "silver", medal_description: "Check-in berat badan 14 hari berturut-turut", progressHint: { label: "0/14 hari", total: 14 } },
  { medal_id: "FIRST_RUN",   medal_name: "Pelari Baru",     medal_tier: "bronze", medal_description: "Menyelesaikan sesi lari pertama", progressHint: { label: "0/1 sesi", total: 1 } },
  { medal_id: "RUN_5K",      medal_name: "5K Finisher",     medal_tier: "silver", medal_description: "Menyelesaikan lari 5 km", progressHint: { label: "0/5 km", total: 5 } },
  { medal_id: "RUN_10K",     medal_name: "10K Hero",        medal_tier: "gold",   medal_description: "Menyelesaikan lari 10 km", progressHint: { label: "0/10 km", total: 10 } },
  { medal_id: "FIRST_RIDE",  medal_name: "Pesepeda Baru",   medal_tier: "bronze", medal_description: "Menyelesaikan sesi sepeda pertama", progressHint: { label: "0/1 sesi", total: 1 } },
  { medal_id: "RIDE_20K",    medal_name: "20K Rider",       medal_tier: "silver", medal_description: "Menyelesaikan ride 20 km", progressHint: { label: "0/20 km", total: 20 } },
];

export const TIER_COLOR: Record<string, string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd700",
  platinum: "#e5e4e2",
};

export function tierGradient(tier: string): string {
  switch (tier) {
    case "bronze":   return "linear-gradient(135deg, #2a1a08, #3d2510)";
    case "silver":   return "linear-gradient(135deg, #1a1a1a, #2d2d2d)";
    case "gold":     return "linear-gradient(135deg, #2a2000, #3d3000)";
    case "platinum": return "linear-gradient(135deg, #1a1a2e, #2d2d3d)";
    default:         return "linear-gradient(135deg, #1a1a1a, #2d2d2d)";
  }
}
