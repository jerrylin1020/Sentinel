// Server-side data fetchers hitting the FastAPI backend.
// Falls back to empty arrays so pages still render if the API is unreachable
// (e.g. during a Vercel build with no backend yet).

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type Severity = "p1" | "p2" | "observe";

export interface ApiSignal {
  id: number;
  ticker: string;
  name: string;
  asset_type: string;
  severity: Severity;
  score: number;
  tags: string[];
  price: number;
  triggered_at: string;
  status: string;
  components: Record<string, number>;
  metrics: Record<string, Record<string, number>>;
}

export interface ApiRule {
  id: string;
  name: string;
  category: string;
  description: string;
  applies_to: string[];
  weight: number;
  params: Record<string, unknown>;
  enabled: boolean;
}

export interface ApiWatched {
  symbol: { id: number; ticker: string; name: string; asset_type: string; exchange: string };
  watched: {
    id: number;
    group: string;
    p1_score_threshold: number;
    volume_multiplier: number;
    enabled_rules: string[];
    channels: string[];
  };
}

export const getSignals = () => get<ApiSignal[]>("/signals").then((d) => d ?? []);
export const getRules = () => get<ApiRule[]>("/rules").then((d) => d ?? []);
export const getWatchlist = () => get<ApiWatched[]>("/watchlist").then((d) => d ?? []);

// Map rule categories to the tag color classes defined in fixtures.
export const categoryColor: Record<string, string> = {
  volume: "text-cyan border-cyan/40",
  technical: "text-amber border-amber/40",
  flow: "text-purple border-purple/40",
  onchain: "text-up border-up/40",
  news: "text-blue border-blue/40",
  composite: "text-down border-down/40",
};
