import { NextResponse } from "next/server"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { existsSync } from "node:fs"

const REPORTS_DIR = join(process.cwd(), "reports")

export async function POST(req: Request) {
  const { url, max_pages = 50, depth = 2 } = await req.json()

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const filename = `report-${timestamp}.json`
  const filepath = join(REPORTS_DIR, filename)

  if (!existsSync(REPORTS_DIR)) {
    await mkdir(REPORTS_DIR, { recursive: true })
  }

  return new Promise<Response>((resolve) => {
    const { spawn } = require("node:child_process")
    const repoRoot = join(process.cwd(), "..", "..", "..", "..")
    const cliPath = join(repoRoot, "apps", "cli", "dist", "index.js")

    const args = [
      "audit", url,
      "--max-pages", String(max_pages),
      "--depth", String(depth),
      "--format", "json",
      "--output", filepath,
    ]

    const proc = spawn("node", [cliPath, ...args], { cwd: repoRoot })

    let stderr = ""
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString() })
    proc.on("close", async (code: number) => {
      if (code !== 0) {
        resolve(NextResponse.json({ error: `Audit failed: ${stderr}` }, { status: 500 }))
        return
      }
      try {
        const content = await require("node:fs/promises").readFile(filepath, "utf-8")
        const report = JSON.parse(content)
        resolve(NextResponse.json({
          filename,
          findings_count: report.findings?.length ?? 0,
          pages_crawled: report.metadata?.pages_crawled ?? 0,
        }))
      } catch {
        resolve(NextResponse.json({ filename }, { status: 200 }))
      }
    })
    proc.on("error", () => {
      resolve(NextResponse.json({ error: "Failed to start audit" }, { status: 500 }))
    })
  })
}
