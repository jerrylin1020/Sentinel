import { SignalOverlay } from "@/components/detail/SignalOverlay";
import { getSignals, getWatchlist } from "@/lib/api";

export default async function DetailPage({ params }: { params: { symbol: string } }) {
  const symbol = decodeURIComponent(params.symbol);
  const [signals, watchlist] = await Promise.all([
    getSignals(undefined, { ticker: symbol, limit: 500 }),
    getWatchlist(),
  ]);
  // Keep this client-side guard while local web points at a deployed API that
  // may not yet understand `ticker`. Once the API supports it, this is a
  // harmless no-op; before then it prevents another ticker's detail from
  // appearing under this route.
  const related = signals.filter((signal) => signal.ticker === symbol);
  const head = related[0];
  const watched = watchlist.find((w) => w.symbol.ticker === symbol);

  return <div>
    <header className="page-heading items-end"><div><p className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-faint">{watched?.symbol.exchange || "Market detail"}</p><h1 className="mt-1 font-mono text-[28px]">{symbol}</h1><p>{head?.name || watched?.symbol.name || "市場標的"}</p></div><div className="text-right">{head && <><p className="font-mono text-[28px] font-semibold leading-none text-text">{head.price.toLocaleString()}</p><p className="mt-1 font-mono text-xs text-cyan">Score {head.score.toFixed(1)}</p></>}</div></header>
    <div className="p-6"><SignalOverlay symbol={symbol} related={related} exchange={watched?.symbol.exchange} p1Threshold={watched?.watched.p1_score_threshold ?? 7.5} /></div>
  </div>;
}
