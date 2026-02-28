"use client"

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react"
import type { WorkspaceDoc, WorkspaceDocName } from "@/lib/atlas-types"
import { MarkdownLite, RawMarkdownPanel } from "./markdown-lite"

function formatTime(mtimeMs: number | null) {
  if (!mtimeMs) return "Unknown"
  return new Date(mtimeMs).toLocaleString()
}

export function WorkspaceDocScreen({
  fileName,
  title,
  subtitle,
  pollMs = 5000,
  refreshToken = 0,
  headerActions,
  topBanner,
}: {
  fileName: WorkspaceDocName
  title: string
  subtitle: string
  pollMs?: number
  refreshToken?: number
  headerActions?: ReactNode
  topBanner?: ReactNode
}) {
  const [doc, setDoc] = useState<WorkspaceDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const response = await fetch(`/api/workspace/file?name=${encodeURIComponent(fileName)}`, {
        cache: "no-store",
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || `Failed to load ${fileName}`)
      }
      if (!mountedRef.current) return
      setDoc(data as WorkspaceDoc)
      setError(null)
    } catch (loadError) {
      if (!mountedRef.current) return
      setError(loadError instanceof Error ? loadError.message : `Failed to load ${fileName}`)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [fileName])

  useEffect(() => {
    mountedRef.current = true
    void load()

    const interval = setInterval(() => {
      void load(true)
    }, pollMs)

    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [load, pollMs, refreshToken])

  const isPlaceholder = /not yet configured|awaiting user input/i.test(doc?.content || "")

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {headerActions}
            <button
              onClick={() => void load()}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {topBanner && <div className="mb-4">{topBanner}</div>}
        <div className="mb-4 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <span className="font-mono uppercase tracking-wider text-muted-foreground">
              File
            </span>
            <span className="font-mono text-foreground">{fileName}</span>
            <span className="text-muted-foreground">Updated {formatTime(doc?.mtimeMs || null)}</span>
            {loading && <span className="text-muted-foreground">Loading...</span>}
            {error && <span className="text-loss">{error}</span>}
          </div>
        </div>

        {!loading && doc && !doc.exists && (
          <div className="mb-4 rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{fileName} does not exist yet.</p>
          </div>
        )}

        {doc?.exists && (
          <div className="space-y-4">
            {isPlaceholder && (
              <div className="rounded-lg border border-border bg-muted/60 p-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  This document is still in a placeholder state. The UI is reading the real file as-is.
                </p>
              </div>
            )}
            <MarkdownLite markdown={doc.content} />
            <RawMarkdownPanel markdown={doc.content} />
          </div>
        )}
      </div>
    </div>
  )
}
