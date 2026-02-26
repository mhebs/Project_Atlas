import { NextRequest, NextResponse } from "next/server"
import { getAllowedWorkspaceFiles, isAllowedWorkspaceFileName, readWorkspaceFile } from "@/lib/server/workspace-files"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")

  if (!name || !isAllowedWorkspaceFileName(name)) {
    return NextResponse.json(
      {
        error: "Invalid file name",
        allowed: getAllowedWorkspaceFiles(),
      },
      { status: 400 },
    )
  }

  try {
    const doc = await readWorkspaceFile(name)
    return NextResponse.json(doc)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to read workspace file" },
      { status: 500 },
    )
  }
}

