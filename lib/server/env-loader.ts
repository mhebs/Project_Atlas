import fs from "node:fs"
import path from "node:path"

function stripWrappingQuotes(value: string) {
  if (value.length < 2) return value
  const first = value[0]
  const last = value[value.length - 1]
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1)
  }
  return value
}

export function parseEnvFileContent(raw: string): Record<string, string> {
  const vars: Record<string, string> = {}

  for (const line of raw.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) continue

    const key = trimmed.slice(0, eqIdx).trim()
    const rawValue = trimmed.slice(eqIdx + 1).trim()
    if (!key) continue

    vars[key] = stripWrappingQuotes(rawValue)
  }

  return vars
}

export function loadRepoEnv(repoRoot: string): Record<string, string> {
  try {
    const raw = fs.readFileSync(path.join(repoRoot, ".env"), "utf-8")
    return parseEnvFileContent(raw)
  } catch {
    return {}
  }
}
