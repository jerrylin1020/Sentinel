import { NextRequest, NextResponse } from "next/server";

type YahooQuote = {
  symbol?: string;
  quoteType?: string;
  longname?: string;
  shortname?: string;
  exchDisp?: string;
  exchange?: string;
};

type SymbolSuggestion = {
  ticker: string;
  name: string;
  asset_type: "equity" | "crypto";
  exchange: string;
};

const SEARCH_URL = "https://query1.finance.yahoo.com/v1/finance/search";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().toUpperCase() ?? "";
  const assetType = request.nextUrl.searchParams.get("asset_type");

  if (query.length < 2 || (assetType !== "equity" && assetType !== "crypto")) {
    return NextResponse.json({ error: "invalid search query" }, { status: 400 });
  }

  const upstream = new URL(SEARCH_URL);
  upstream.searchParams.set("q", query);
  upstream.searchParams.set("quotesCount", "12");
  upstream.searchParams.set("newsCount", "0");

  try {
    const response = await fetch(upstream, {
      headers: { "User-Agent": "Mozilla/5.0 (Sentinel symbol search)" },
      next: { revalidate: 600 },
    });
    if (!response.ok) {
      console.error("[symbol-search] Yahoo request failed", { status: response.status, query, assetType });
      return NextResponse.json({ error: "symbol provider unavailable" }, { status: 502 });
    }

    const payload = (await response.json()) as { quotes?: YahooQuote[] };
    const suggestions = normalizeQuotes(payload.quotes ?? [], assetType);
    return NextResponse.json(suggestions, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" },
    });
  } catch (error) {
    console.error("[symbol-search] request failed", { query, assetType, error: String(error) });
    return NextResponse.json({ error: "symbol provider unavailable" }, { status: 502 });
  }
}

function normalizeQuotes(quotes: YahooQuote[], assetType: "equity" | "crypto") {
  const results: SymbolSuggestion[] = [];
  const seen = new Set<string>();

  for (const quote of quotes) {
    const suggestion = normalizeQuote(quote, assetType);
    if (!suggestion || seen.has(suggestion.ticker)) continue;
    seen.add(suggestion.ticker);
    results.push(suggestion);
    if (results.length === 8) break;
  }
  return results;
}

function normalizeQuote(quote: YahooQuote, assetType: "equity" | "crypto"): SymbolSuggestion | null {
  const quoteType = quote.quoteType?.toUpperCase() ?? "";
  const rawSymbol = quote.symbol?.toUpperCase() ?? "";
  const name = quote.longname || quote.shortname || rawSymbol;

  if (assetType === "equity") {
    if (!rawSymbol || !["EQUITY", "ETF"].includes(quoteType)) return null;
    return {
      ticker: rawSymbol,
      name,
      asset_type: "equity",
      exchange: quote.exchDisp || quote.exchange || "",
    };
  }

  if (quoteType !== "CRYPTOCURRENCY" || !rawSymbol.endsWith("-USD")) return null;
  return {
    ticker: `${rawSymbol.slice(0, -4)}USDT`,
    name,
    asset_type: "crypto",
    exchange: "BINANCE",
  };
}
