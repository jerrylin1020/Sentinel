import { WatchlistManager } from "@/components/watchlist/WatchlistManager";
import { getRules, getWatchlist } from "@/lib/api";

export default async function WatchlistPage() {
  const [items, rules] = await Promise.all([getWatchlist(), getRules()]);
  const allRules = rules.map((r) => ({ id: r.id, name: r.name, category: r.category, applies_to: r.applies_to }));

  return <WatchlistManager initial={items} allRules={allRules} />;
}
