import fs from "node:fs/promises"
import path from "node:path"
import type { WorkspaceDoc, WorkspaceDocName } from "@/lib/atlas-types"
import { getWorkspaceRoot } from "./config"

const ALLOWED_WORKSPACE_FILES = new Set<WorkspaceDocName>([
  "STRATEGY.md",
  "PORTFOLIO.md",
  "ACCOUNTS.md",
  "USER.md",
])

export function isAllowedWorkspaceFileName(name: string): name is WorkspaceDocName {
  return ALLOWED_WORKSPACE_FILES.has(name as WorkspaceDocName)
}

export async function readWorkspaceFile(name: WorkspaceDocName): Promise<WorkspaceDoc> {
  const workspaceRoot = getWorkspaceRoot()
  const filePath = path.resolve(workspaceRoot, name)

  if (!filePath.startsWith(workspaceRoot)) {
    throw new Error("Workspace file path escaped workspace root")
  }

  try {
    const [content, stat] = await Promise.all([
      fs.readFile(filePath, "utf-8"),
      fs.stat(filePath),
    ])

    return {
      name,
      exists: true,
      content,
      mtimeMs: stat.mtimeMs,
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        name,
        exists: false,
        content: "",
        mtimeMs: null,
      }
    }
    throw error
  }
}

export function getAllowedWorkspaceFiles() {
  return Array.from(ALLOWED_WORKSPACE_FILES.values())
}

