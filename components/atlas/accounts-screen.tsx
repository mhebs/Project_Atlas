"use client"

import { useMemo, useState } from "react"
import type { DebugResetResponse } from "@/lib/atlas-types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { WorkspaceDocScreen } from "./workspace-doc-screen"

export function AccountsScreen() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [resetResult, setResetResult] = useState<DebugResetResponse | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  const banner = useMemo(() => {
    if (!resetResult) return null

    const isError = !resetResult.ok
    const isWarning = resetResult.ok && resetResult.warnings.length > 0
    const borderClass = isError
      ? "border-[var(--loss)]/35 bg-[var(--loss)]/10"
      : isWarning
        ? "border-yellow-500/35 bg-yellow-500/10"
        : "border-emerald-500/35 bg-emerald-500/10"
    const textClass = isError
      ? "text-[var(--loss)]"
      : isWarning
        ? "text-yellow-300"
        : "text-emerald-300"

    const title = isError
      ? "Debug reset failed."
      : resetResult.mode === "partial_market_closed"
        ? "Partial reset complete."
        : "Debug reset complete."

    const detail = isError
      ? resetResult.error || "Unexpected reset failure"
      : resetResult.mode === "partial_market_closed"
        ? "Market was closed, so broker liquidation was skipped. Markdown reflects live broker state."
        : "Broker positions were liquidated and test artifacts were reset."

    return (
      <div className={`rounded-lg border p-4 ${borderClass}`}>
        <p className={`text-sm font-medium ${textClass}`}>{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        {!isError && (
          <p className="mt-2 text-xs text-muted-foreground">
            Files reset: {resetResult.filesReset.length} | Sessions deleted: {resetResult.sessionsDeleted} |
            Trades log cleared: {resetResult.tradesLogCleared ? "yes" : "no"}
          </p>
        )}
        {resetResult.warnings.length > 0 && (
          <ul className="mt-2 space-y-1">
            {resetResult.warnings.map((warning, index) => (
              <li key={`${warning}-${index}`} className="text-xs text-muted-foreground">
                - {warning}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }, [resetResult])

  const runReset = async () => {
    if (isResetting) return

    setIsResetting(true)
    setResetResult(null)

    try {
      const response = await fetch("/api/debug/reset", { method: "POST" })
      const data = (await response.json()) as Partial<DebugResetResponse>

      const normalized: DebugResetResponse = {
        ok: Boolean(data.ok) && response.ok,
        mode: data.mode ?? null,
        broker: data.broker ?? null,
        filesReset: Array.isArray(data.filesReset) ? data.filesReset : [],
        sessionsDeleted: typeof data.sessionsDeleted === "number" ? data.sessionsDeleted : 0,
        tradesLogCleared: Boolean(data.tradesLogCleared),
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
        error: typeof data.error === "string" ? data.error : response.ok ? null : "Failed to run debug reset",
      }

      if (!response.ok) {
        normalized.ok = false
      }

      setResetResult(normalized)
    } catch (error) {
      setResetResult({
        ok: false,
        mode: null,
        broker: null,
        filesReset: [],
        sessionsDeleted: 0,
        tradesLogCleared: false,
        warnings: [],
        error: error instanceof Error ? error.message : "Failed to run debug reset",
      })
    } finally {
      setIsResetting(false)
      setConfirmOpen(false)
      setRefreshToken((value) => value + 1)
    }
  }

  const headerActions = (
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogTrigger asChild>
        <button
          disabled={isResetting}
          className="rounded-md border border-[var(--loss)]/50 bg-[var(--loss)]/10 px-3 py-1.5 text-xs font-mono text-[var(--loss)] hover:border-[var(--loss)] hover:bg-[var(--loss)]/20 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isResetting ? "Resetting..." : "Reset Test State"}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset test state?</AlertDialogTitle>
          <AlertDialogDescription>
            This will reset markdown state, clear session and trades logs, and try to liquidate all paper positions
            if markets are open.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Files reset: USER.md, STRATEGY.md, PORTFOLIO.md, ACCOUNTS.md, MEMORY.md, THESES.md, WATCHLIST.md.
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isResetting}
            onClick={(event) => {
              event.preventDefault()
              void runReset()
            }}
            className="bg-[var(--loss)] text-white hover:bg-[var(--loss)]/85"
          >
            {isResetting ? "Running..." : "Run Reset"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return (
    <WorkspaceDocScreen
      fileName="ACCOUNTS.md"
      title="Connected Accounts"
      subtitle="Broker connections and account status managed by the agent."
      refreshToken={refreshToken}
      headerActions={headerActions}
      topBanner={banner}
    />
  )
}
