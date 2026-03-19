"use client"

import { useEffect, useState } from "react"
import { SiliconGatePanel } from "./silicon-gate-panel"
import { BrokerageConnectPanel } from "./brokerage-connect-panel"

interface BrokerageConnectOverlayProps {
  onConnect: () => void
  onBack: () => void
}

export function BrokerageConnectOverlay({ onConnect, onBack }: BrokerageConnectOverlayProps) {
  const [exiting, setExiting] = useState(false)
  const [prefill, setPrefill] = useState<{ apiKey: string; secretKey: string } | null>(null)

  useEffect(() => {
    fetch("/api/brokerage/prefill")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setPrefill(data)
      })
      .catch(() => {})
  }, [])

  const handleConnect = () => {
    setExiting(true)
    setTimeout(onConnect, 300)
  }

  const handleBack = () => {
    setExiting(true)
    setTimeout(onBack, 300)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex"
      style={exiting ? { animation: "fadeOut 300ms ease-in forwards" } : { animation: "fadeIn 600ms ease-out" }}
    >
      {/* Left panel — 40% */}
      <div className="h-screen w-[40%]">
        <SiliconGatePanel
          headline={
            <>
              Connect your
              <br />
              <em>brokerage.</em>
            </>
          }
          subheading="Your capital stays with Alpaca at all times. Atlas never touches your funds."
          currentStep={3}
          totalSteps={5}
        />
      </div>

      {/* Right panel — 60% */}
      <div className="h-screen w-[60%]">
        <BrokerageConnectPanel
          onConnect={handleConnect}
          onBack={handleBack}
          initialApiKey={prefill?.apiKey}
          initialSecretKey={prefill?.secretKey}
        />
      </div>
    </div>
  )
}
