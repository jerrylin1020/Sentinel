import { SignalOverlay } from "@/components/detail/SignalOverlay";
import { getSignals, getWatchlist } from "@/lib/api";

export default async function DetailPage({ params }: { params: { symbol: string } }) {
  const symbol = decodeURIComponent(params.symbol);
  const [all, watchlist] = await Promise.all([getSignals(), getWatchlist()]);
  const related = all.filter((s) => s.ticker === symbol);
  const head = related[0];
  const watched = watchlist.find((w) => w.symbol.ticker === symbol);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <h1 className="mono text-3xl font-bold">{symbol}</h1>
        {head && <span className="mono text-2xl text-text-dim">{head.price.toLocaleString()}</span>}
      </div>

      <SignalOverlay symbol={symbol} related={related} exchange={watched?.symbol.exchange} />
    </div>
  );
}
