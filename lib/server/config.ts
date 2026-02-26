import fs from "node:fs"
import path from "node:path"

function resolveRepoRoot() {
  // Default assumes this Next app lives at <repo>/Project_Atlas
  return path.resolve(process.env.ATLAS_REPO_ROOT || path.resolve(process.cwd(), ".."))
}

export function getRepoRoot() {
  const repoRoot = resolveRepoRoot()
  if (!fs.existsSync(repoRoot)) {
    throw new Error(`ATLAS repo root does not exist: ${repoRoot}`)
  }
  return repoRoot
}

export function getWorkspaceRoot() {
  const repoRoot = getRepoRoot()
  const workspaceDir = process.env.ATLAS_WORKSPACE_DIR || "workspace"
  const workspaceRoot = path.resolve(repoRoot, workspaceDir)

  if (!workspaceRoot.startsWith(repoRoot)) {
    throw new Error("Workspace path must resolve within ATLAS_REPO_ROOT")
  }

  if (!fs.existsSync(workspaceRoot)) {
    throw new Error(`Workspace directory does not exist: ${workspaceRoot}`)
  }

  return workspaceRoot
}

export function getSessionsDir() {
  return path.join(getWorkspaceRoot(), "sessions")
}

