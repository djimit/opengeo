import { NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { existsSync } from "node:fs"

const REPORTS_DIR = join(process.cwd(), "reports")

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params
  const filepath = join(REPORTS_DIR, filename)

  if (!existsSync(filepath)) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 })
  }

  try {
    const content = await readFile(filepath, "utf-8")
    const report = JSON.parse(content)
    return NextResponse.json({ report })
  } catch {
    return NextResponse.json({ error: "Invalid report file" }, { status: 400 })
  }
}
