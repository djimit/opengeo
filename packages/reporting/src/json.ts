import type { Report } from "@opengeo/shared"

export function generateJsonReport(report: Report): string {
  return JSON.stringify(report, null, 2)
}
