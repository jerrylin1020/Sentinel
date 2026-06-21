// Phase 1 placeholder data. Swap for API calls to the FastAPI backend later.

export type Severity = "p1" | "p2" | "observe";
export type TagType = "volume" | "breakout" | "flow" | "onchain" | "news" | "tech";

export const tagColor: Record<TagType, string> = {
  volume: "text-cyan border-cyan/40",
  breakout: "text-amber border-amber/40",
  flow: "text-purple border-purple/40",
  onchain: "text-up border-up/40",
  news: "text-blue border-blue/40",
  tech: "text-down border-down/40",
};

export const severityColor: Record<Severity, string> = {
  p1: "text-p1 border-p1/50",
  p2: "text-p2 border-p2/50",
  observe: "text-text-dim border-border-light",
};

export interface SignalRow {
  id: number;
  ticker: string;
  name: string;
  severity: Severity;
  score: number;
  tags: TagType[];
  detail: string;
  price: number;
  change: number;
  time: string;
}

export const signals: SignalRow[] = [
  { id: 101, ticker: "NVDA", name: "NVIDIA Corp", severity: "p1", score: 8.7, tags: ["volume", "breakout", "flow"], detail: "Volume 3.4x · 52W high break · dark-pool block", price: 1024.3, change: 4.21, time: "21:04" },
  { id: 102, ticker: "BTCUSDT", name: "Bitcoin", severity: "p1", score: 7.9, tags: ["volume", "onchain"], detail: "Volume 2.8x · whale inflow $42M", price: 68210, change: 2.7, time: "20:58" },
  { id: 103, ticker: "AAPL", name: "Apple Inc", severity: "p2", score: 5.2, tags: ["volume"], detail: "Volume 2.1x trailing 20d average", price: 226.4, change: 1.1, time: "20:31" },
  { id: 104, ticker: "ETHUSDT", name: "Ethereum", severity: "p2", score: 4.8, tags: ["news"], detail: "Positive news sentiment spike", price: 3380, change: -0.6, time: "19:50" },
  { id: 105, ticker: "TSLA", name: "Tesla Inc", severity: "observe", score: 2.3, tags: ["tech"], detail: "Long green candle (body 2.1%)", price: 248.9, change: 0.9, time: "19:12" },
];

export const watchlist = [
  { id: 1, ticker: "NVDA", name: "NVIDIA Corp", type: "equity", group: "Tech Mega Caps", threshold: 7.0, rules: 6, channels: ["telegram", "email"] },
  { id: 2, ticker: "AAPL", name: "Apple Inc", type: "equity", group: "Tech Mega Caps", threshold: 7.5, rules: 5, channels: ["telegram"] },
  { id: 3, ticker: "BTCUSDT", name: "Bitcoin", type: "crypto", group: "Crypto Majors", threshold: 7.0, rules: 8, channels: ["telegram"] },
  { id: 4, ticker: "ETHUSDT", name: "Ethereum", type: "crypto", group: "Crypto Majors", threshold: 7.0, rules: 8, channels: ["telegram", "line"] },
];

export const rules = [
  { id: "volume_spike_2x", name: "Volume Spike 2x+", category: "volume", weight: 2.4, enabled: true, winRate: 0.58, falsePositive: 0.19, triggersPerDay: 3.2 },
  { id: "breakout_52w", name: "52-Week High Breakout", category: "technical", weight: 2.1, enabled: true, winRate: 0.61, falsePositive: 0.15, triggersPerDay: 1.1 },
  { id: "ma200_breakout", name: "200MA Breakout", category: "technical", weight: 1.8, enabled: true, winRate: 0.54, falsePositive: 0.22, triggersPerDay: 0.8 },
  { id: "whale_inflow", name: "Whale Inflow ≥ $X", category: "onchain", weight: 2.0, enabled: true, winRate: 0.49, falsePositive: 0.27, triggersPerDay: 2.4 },
  { id: "news_positive", name: "Positive News", category: "news", weight: 2.4, enabled: false, winRate: 0.46, falsePositive: 0.31, triggersPerDay: 5.6 },
];
