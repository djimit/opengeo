import { NextResponse } from "next/server"
import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { existsSync } from "node:fs"

const REPORTS_DIR = join(process.cwd(), "reports")

export async function GET() {
  try {
    if (!existsSync(REPORTS_DIR)) {
      return NextResponse.json({ reports: [] })
    }
    const files = await readdir(REPORTS_DIR)
    const reports = await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .slice(0, 20)
        .map(async (file) => {
          const content = await readFile(join(REPORTS_DIR, file), "utf-8")
          try {
            const report = JSON.parse(content)
            return {
              filename: file,
              target_url: report.metadata?.target_url,
              finished_at: report.metadata?.finished_at,
              pages_crawled: report.metadata?.pages_crawled,
              findings_count: report.findings?.length ?? 0,
              critical: report.findings?.filter((f: { severity: string }) => f.severity === "critical").length ?? 0,
              high: report.findings?.filter((f: { severity: string }) => f.severity === "high").length ?? 0,
              medium: report.findings?.filter((f: { severity: string }) => f.severity === "medium").length ?? 0,
              low: report.findings?.filter((f: { severity: string }) => f.severity === "low").length ?? 0,
            }
          } catch {
            return null
          }
        }),
    )
    return NextResponse.json({ reports: reports.filter(Boolean) })
  } catch {
    return NextResponse.json({ reports: [] })
  }
}
