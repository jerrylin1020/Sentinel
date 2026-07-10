import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";

const base = (process.env.SENTINEL_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

async function proxy(request: NextRequest, { params }: { params: { path: string[] } }) {
  const url = new URL(request.url);
  const target = `${base}/${params.path.join("/")}${url.search}`;
  const isRead = request.method === "GET" || request.method === "HEAD";
  const isCandles = params.path[0] === "candles";
  const ttl = isCandles ? 300 : 30;
  const tag = `sentinel:/${params.path[0]}`;
  const response = await fetch(target, {
    method: request.method,
    headers: request.headers.get("content-type") ? { "content-type": request.headers.get("content-type")! } : undefined,
    body: isRead ? undefined : await request.text(),
    ...(isRead ? { next: { revalidate: ttl, tags: [tag] } } : { cache: "no-store" as const }),
  });

  if (response.ok && !isRead) {
    revalidateTag(tag);
    if (params.path[0] === "watchlist") revalidateTag("sentinel:/candles");
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json",
      ...(isRead ? { "cache-control": `public, max-age=${ttl}, stale-while-revalidate=${ttl * 4}` } : {}),
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
