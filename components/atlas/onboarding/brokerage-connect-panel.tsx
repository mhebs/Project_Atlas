"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Check, Minus, ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react"

interface BrokerageConnectPanelProps {
  onConnect: () => void
  onBack: () => void
  initialApiKey?: string
  initialSecretKey?: string
}

const PERMISSIONS = [
  { label: "Read portfolio & positions", allowed: true },
  { label: "Execute trades within strategy rules", allowed: true },
  { label: "Read order history", allowed: true },
  { label: "Cannot withdraw funds", allowed: false },
  { label: "Cannot trade outside strategy guardrails", allowed: false },
]

export function BrokerageConnectPanel({
  onConnect,
  onBack,
  initialApiKey = "",
  initialSecretKey = "",
}: BrokerageConnectPanelProps) {
  const [apiKey, setApiKey] = useState(initialApiKey)
  const [secretKey, setSecretKey] = useState(initialSecretKey)
  const [showSecret, setShowSecret] = useState(false)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync pre-fill values when they arrive async
  useEffect(() => {
    if (initialApiKey) setApiKey(initialApiKey)
  }, [initialApiKey])
  useEffect(() => {
    if (initialSecretKey) setSecretKey(initialSecretKey)
  }, [initialSecretKey])

  const canSubmit = apiKey.trim().length > 0 && secretKey.trim().length > 0 && !validating

  async function handleSubmit() {
    if (!canSubmit) return
    setValidating(true)
    setError(null)

    try {
      // Validate credentials
      const validateRes = await fetch("/api/brokerage/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim(), secretKey: secretKey.trim() }),
      })
      const validateData = await validateRes.json()

      if (!validateData.valid) {
        setError(validateData.error || "Invalid credentials")
        setValidating(false)
        return
      }

      // Save to .env
      await fetch("/api/brokerage/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim(), secretKey: secretKey.trim() }),
      })

      onConnect()
    } catch {
      setError("Could not reach the server. Please try again.")
      setValidating(false)
    }
  }

  return (
    <div className="flex h-full w-full flex-col bg-ob-parchment">
      {/* Back button */}
      <div className="px-12 pt-8">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 font-sans text-[13px] text-ob-muted transition-colors hover:text-ob-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto px-12 py-12">
        <div className="w-full max-w-[480px]">
          {/* Eyebrow */}
          <p
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-ob-gold"
            style={{ animation: "fadeSlideUp 600ms ease-out 300ms both" }}
          >
            Connect account
          </p>

          {/* Headline */}
          <h2
            className="mt-5 font-sans text-[28px] font-semibold leading-tight text-ob-ink"
            style={{ animation: "fadeSlideUp 600ms ease-out 400ms both" }}
          >
            Enter your API credentials
          </h2>

          {/* Helper text */}
          <p
            className="mt-2 font-sans text-[14px] leading-relaxed text-ob-muted"
            style={{ animation: "fadeSlideUp 600ms ease-out 500ms both" }}
          >
            Find these in your Alpaca dashboard under API Keys.
            They are never stored — only used to authorize Atlas.
          </p>

          {/* Form */}
          <div
            className="mt-8 flex flex-col gap-5"
            style={{ animation: "fadeSlideUp 600ms ease-out 600ms both" }}
          >
            {/* API Key ID */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="apiKeyId" className="font-sans text-[13px] font-medium text-ob-ink">
                API Key ID
              </label>
              <Input
                id="apiKeyId"
                type="text"
                placeholder="PKxxxxxxxxxxxxxxxx"
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setError(null) }}
                className="h-12 border-ob-border bg-white px-4 font-mono text-[14px] text-ob-ink placeholder:text-ob-muted/40"
              />
            </div>

            {/* Secret Key */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="secretKey" className="font-sans text-[13px] font-medium text-ob-ink">
                Secret Key
              </label>
              <div className="relative">
                <Input
                  id="secretKey"
                  type={showSecret ? "text" : "password"}
                  placeholder="Enter your secret key"
                  value={secretKey}
                  onChange={(e) => { setSecretKey(e.target.value); setError(null) }}
                  className="h-12 border-ob-border bg-white px-4 pr-11 font-mono text-[14px] text-ob-ink placeholder:text-ob-muted/40"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ob-muted/60 transition-colors hover:text-ob-ink"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Validation error */}
          {error && (
            <p className="mt-3 font-sans text-[13px] text-red-600">
              {error}
            </p>
          )}

          {/* Permissions */}
          <div
            className="mt-8"
            style={{ animation: "fadeSlideUp 600ms ease-out 700ms both" }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ob-muted/60">
              Atlas permissions
            </p>
            <div className="mt-3 border-t border-ob-border" />
            <ul className="mt-3 flex flex-col gap-2">
              {PERMISSIONS.map((perm) => (
                <li key={perm.label} className="flex items-center gap-2.5">
                  {perm.allowed ? (
                    <Check className="h-3.5 w-3.5 flex-shrink-0 text-ob-accent-bright" />
                  ) : (
                    <Minus className="h-3.5 w-3.5 flex-shrink-0 text-ob-muted/40" />
                  )}
                  <span
                    className={`font-sans text-[13px] ${
                      perm.allowed ? "text-ob-ink/80" : "text-ob-muted/50"
                    }`}
                  >
                    {perm.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="mt-8 flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-[#24613B] font-sans text-[15px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ animation: "fadeSlideUp 600ms ease-out 800ms both" }}
          >
            {validating ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Validating...
              </span>
            ) : (
              <>
                Connect account
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          {/* Trust footer */}
          <p
            className="mt-6 text-center font-sans text-[11px] text-ob-muted/50"
            style={{ animation: "fadeSlideUp 600ms ease-out 900ms both" }}
          >
            Execution via Alpaca Markets &middot; SEC-registered broker-dealer
          </p>
        </div>
      </div>
    </div>
  )
}
