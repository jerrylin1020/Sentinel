import { NextRequest } from "next/server";

const base = (process.env.SENTINEL_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

async function proxy(request: NextRequest, { params }: { params: { path: string[] } }) {
  const url = new URL(request.url);
  const target = `${base}/${params.path.join("/")}${url.search}`;
  const response = await fetch(target, {
    method: request.method,
    headers: request.headers.get("content-type") ? { "content-type": request.headers.get("content-type")! } : undefined,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
    cache: "no-store",
  });

  return new Response(response.body, {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
