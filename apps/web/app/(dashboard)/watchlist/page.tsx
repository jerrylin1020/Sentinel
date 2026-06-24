import { Panel } from "@/components/ui/Panel";
import { WatchlistManager } from "@/components/watchlist/WatchlistManager";
import { getRules, getWatchlist } from "@/lib/api";

export default async function WatchlistPage() {
  const [items, rules] = await Promise.all([getWatchlist(), getRules()]);
  const allRules = rules.map((r) => ({ id: r.id, name: r.name }));

  return (
    <Panel title={`Watchlist · 觀察名單管理 (${items.length})`}>
      <WatchlistManager initial={items} allRules={allRules} />
    </Panel>
  );
}
