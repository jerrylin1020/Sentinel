// Server-side data fetchers hitting the FastAPI backend.
// Falls back to empty arrays so pages still render if the API is unreachable
// (e.g. during a Vercel build with no backend yet).

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const MUTATION_PROXY = "/api/backend";

async function get<T>(path: string): Promise<T | null> {
  try {
    const tag = `sentinel:${path.split("?")[0]}`;
    const res = await fetch(`${BASE}${path}`, {
      next: { revalidate: 30, tags: [tag] },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// --- Client-side mutations (called from "use client" components) ---
async function mutate(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
  const res = await fetch(`${MUTATION_PROXY}${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `儲存失敗（${res.status}）`);
  }
  return res;
}

export async function apiPost(path: string, body: unknown) {
  return mutate(path, "POST", body);
}

export async function apiPatch(path: string, body: unknown) {
  return mutate(path, "PATCH", body);
}

export async function apiDelete(path: string) {
  return mutate(path, "DELETE");
}

export type Severity = "p1" | "p2" | "observe";

export interface ApiSignalRule {
  id: string;
  name: string;
  category: string;
  detail: string;
}

export interface ApiSignal {
  id: number;
  ticker: string;
  name: string;
  asset_type: string;
  severity: Severity;
  score: number;
  tags: string[];
  rules: ApiSignalRule[];
  price: number;
  triggered_at: string;
  status: string;
  components: Record<string, number>;
  metrics: Record<string, Record<string, number>>;
}

export interface ApiBacktest {
  win_rate: number;
  avg_return: number;
  false_positive_rate: number;
  sharpe: number;
  triggers_per_day: number;
  sample_triggers: number;
  updated_at: string;
}

export interface ApiRule {
  id: string;
  name: string;
  category: string;
  description: string;
  applies_to: string[];
  weight: number;
  timeframe: string;
  data_source: string;
  params: Record<string, unknown>;
  enabled: boolean;
  backtest: ApiBacktest | null;
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

export const getSignals = (severity?: Severity) =>
  get<ApiSignal[]>(`/signals${severity ? `?severity=${severity}` : ""}`).then((d) => d ?? []);
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
