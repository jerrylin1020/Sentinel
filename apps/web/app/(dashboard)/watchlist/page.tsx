import { WatchlistManager } from "@/components/watchlist/WatchlistManager";
import { getRules, getWatchlist } from "@/lib/api";

export default async function WatchlistPage() {
  const [items, rules] = await Promise.all([getWatchlist(), getRules()]);
  const allRules = rules.map((r) => ({ id: r.id, name: r.name, category: r.category, applies_to: r.applies_to }));

  return <div>
    <header className="page-heading"><div><h1>觀察名單</h1><p>{items.length} 個標的 · 管理個別告警門檻與推播通路</p></div></header>
    <WatchlistManager initial={items} allRules={allRules} />
  </div>;
}
