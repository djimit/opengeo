import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import type { Report, Finding } from "@opengeo/shared"

export interface AuditRecord {
  id: string
  target_url: string
  started_at: string
  finished_at: string
  pages_crawled: number
  rules_evaluated: number
  findings_count: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  report_json: string
}

export interface TrendPoint {
  date: string
  findings_count: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
}

export class AuditStore {
  private db: Database | null = null
  private dbPath: string

  constructor(dataDir: string = join(process.cwd(), ".opengeo")) {
    this.dbPath = join(dataDir, "audits.db")
  }

  private getDatabase(): Database {
    if (!this.db) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Database = require("better-sqlite3")
      this.db = new Database(this.dbPath)
      this.initTables()
    }
    return this.db!
  }

  private initTables(): void {
    const db = this.db!
    db.exec(`
      CREATE TABLE IF NOT EXISTS audits (
        id TEXT PRIMARY KEY,
        target_url TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT NOT NULL,
        pages_crawled INTEGER NOT NULL DEFAULT 0,
        rules_evaluated INTEGER NOT NULL DEFAULT 0,
        findings_count INTEGER NOT NULL DEFAULT 0,
        critical_count INTEGER NOT NULL DEFAULT 0,
        high_count INTEGER NOT NULL DEFAULT 0,
        medium_count INTEGER NOT NULL DEFAULT 0,
        low_count INTEGER NOT NULL DEFAULT 0,
        report_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_audits_target_url ON audits(target_url);
      CREATE INDEX IF NOT EXISTS idx_audits_finished_at ON audits(finished_at);

      CREATE TABLE IF NOT EXISTS findings (
        id TEXT NOT NULL,
        audit_id TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        severity TEXT NOT NULL,
        confidence TEXT NOT NULL,
        evidence_url TEXT NOT NULL,
        recommendation_action TEXT NOT NULL,
        resolved INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (id, audit_id),
        FOREIGN KEY (audit_id) REFERENCES audits(id)
      );

      CREATE INDEX IF NOT EXISTS idx_findings_audit_id ON findings(audit_id);
      CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings(severity);
      CREATE INDEX IF NOT EXISTS idx_findings_category ON findings(category);
    `)
  }

  async saveReport(report: Report): Promise<string> {
    await mkdir(this.dirname(this.dbPath), { recursive: true })
    const db = this.getDatabase()
    const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const stmt = db.prepare(`
      INSERT INTO audits (id, target_url, started_at, finished_at, pages_crawled, rules_evaluated,
        findings_count, critical_count, high_count, medium_count, low_count, report_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const critical = report.findings.filter((f) => f.severity === "critical").length
    const high = report.findings.filter((f) => f.severity === "high").length
    const medium = report.findings.filter((f) => f.severity === "medium").length
    const low = report.findings.filter((f) => f.severity === "low").length

    stmt.run(
      id,
      report.metadata.target_url,
      report.metadata.started_at,
      report.metadata.finished_at,
      report.metadata.pages_crawled,
      report.metadata.rules_evaluated,
      report.findings.length,
      critical,
      high,
      medium,
      low,
      JSON.stringify(report),
    )

    // Save individual findings
    const findingStmt = db.prepare(`
      INSERT INTO findings (id, audit_id, title, category, severity, confidence, evidence_url, recommendation_action)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const finding of report.findings) {
      findingStmt.run(
        finding.id,
        id,
        finding.title,
        finding.category,
        finding.severity,
        finding.confidence,
        finding.evidence.url,
        finding.recommendation.action,
      )
    }

    return id
  }

  getAudits(limit: number = 50): AuditRecord[] {
    const db = this.getDatabase()
    return db.prepare(
      "SELECT * FROM audits ORDER BY finished_at DESC LIMIT ?",
    ).all(limit) as AuditRecord[]
  }

  getAuditsByUrl(targetUrl: string): AuditRecord[] {
    const db = this.getDatabase()
    return db.prepare(
      "SELECT * FROM audits WHERE target_url = ? ORDER BY finished_at DESC",
    ).all(targetUrl) as AuditRecord[]
  }

  getAuditById(id: string): AuditRecord | null {
    const db = this.getDatabase()
    return db.prepare(
      "SELECT * FROM audits WHERE id = ?",
    ).get(id) as AuditRecord | null
  }

  getTrend(targetUrl: string, limit: number = 10): TrendPoint[] {
    const db = this.getDatabase()
    return db.prepare(`
      SELECT date(finished_at) as date,
             findings_count, critical_count, high_count, medium_count, low_count
      FROM audits
      WHERE target_url = ?
      ORDER BY finished_at DESC
      LIMIT ?
    `).all(targetUrl, limit) as TrendPoint[]
  }

  compareAudits(auditId1: string, auditId2: string): {
    new_findings: Finding[]
    resolved_findings: Finding[]
    unchanged_findings: Finding[]
  } {
    const db = this.getDatabase()

    const findings1 = db.prepare(
      "SELECT id, title, category, severity FROM findings WHERE audit_id = ?",
    ).all(auditId1) as Array<{ id: string; title: string; category: string; severity: string }>

    const findings2 = db.prepare(
      "SELECT id, title, category, severity FROM findings WHERE audit_id = ?",
    ).all(auditId2) as Array<{ id: string; title: string; category: string; severity: string }>

    const ids1 = new Set(findings1.map((f) => f.id))
    const ids2 = new Set(findings2.map((f) => f.id))

    const newFindings = findings2.filter((f) => !ids1.has(f.id)) as unknown as Finding[]
    const resolvedFindings = findings1.filter((f) => !ids2.has(f.id)) as unknown as Finding[]
    const unchangedFindings = findings2.filter((f) => ids1.has(f.id)) as unknown as Finding[]

    return {
      new_findings: newFindings,
      resolved_findings: resolvedFindings,
      unchanged_findings: unchangedFindings,
    }
  }

  markResolved(findingId: string, auditId: string): void {
    const db = this.getDatabase()
    db.prepare(
      "UPDATE findings SET resolved = 1 WHERE id = ? AND audit_id = ?",
    ).run(findingId, auditId)
  }

  getStats(): { total_audits: number; total_findings: number; unresolved_critical: number } {
    const db = this.getDatabase()
    return db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM audits) as total_audits,
        (SELECT COUNT(*) FROM findings) as total_findings,
        (SELECT COUNT(*) FROM findings WHERE severity = 'critical' AND resolved = 0) as unresolved_critical
    `).get() as { total_audits: number; total_findings: number; unresolved_critical: number }
  }

  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  private dirname(path: string): string {
    const lastSlash = path.lastIndexOf("/")
    return lastSlash > 0 ? path.slice(0, lastSlash) : "."
  }

  // Make AuditStore serializable for JSON persistence
  toJSON(): string {
    return JSON.stringify({ dbPath: this.dbPath })
  }
}

// Type stub for better-sqlite3 (runtime-only dependency)
interface Database {
  exec(sql: string): void
  prepare(sql: string): { run(...params: unknown[]): unknown; all(...params: unknown[]): unknown[]; get(...params: unknown[]): unknown }
  close(): void
}
