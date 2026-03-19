import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ALPACA_PAPER_BASE_URL = "https://paper-api.alpaca.markets"

export async function POST(request: Request) {
  const body = await request.json()
  const { apiKey, secretKey } = body as { apiKey?: string; secretKey?: string }

  if (!apiKey || !secretKey) {
    return NextResponse.json(
      { valid: false, error: "API Key and Secret Key are required" },
      { status: 400 },
    )
  }

  try {
    const res = await fetch(`${ALPACA_PAPER_BASE_URL}/v2/account`, {
      headers: {
        "APCA-API-KEY-ID": apiKey,
        "APCA-API-SECRET-KEY": secretKey,
      },
      cache: "no-store",
    })

    if (!res.ok) {
      return NextResponse.json({
        valid: false,
        error:
          res.status === 401 || res.status === 403
            ? "Invalid API credentials. Check your key and secret."
            : `Alpaca API error (${res.status})`,
      })
    }

    const account = await res.json()

    return NextResponse.json({
      valid: true,
      account: {
        id: account.id,
        status: account.status,
        currency: account.currency,
        cash: account.cash,
        portfolioValue: account.portfolio_value,
      },
    })
  } catch (err) {
    return NextResponse.json({
      valid: false,
      error: err instanceof Error ? err.message : "Failed to reach Alpaca API",
    })
  }
}
