import { NextResponse } from "next/server";

const base = (process.env.SENTINEL_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const secret = process.env.SENTINEL_CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { detail: "立即掃描尚未設定 SENTINEL_CRON_SECRET。" },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(`${base}/cron/scan`, {
      method: "POST",
      headers: { "X-Cron-Secret": secret },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { detail: payload.detail || `掃描服務回應 ${response.status}` },
        { status: response.status },
      );
    }
    return NextResponse.json({ scanned: payload.scanned, signals: payload.signals });
  } catch {
    return NextResponse.json(
      { detail: "無法連線至掃描服務，請稍後再試。" },
      { status: 502 },
    );
  }
}
