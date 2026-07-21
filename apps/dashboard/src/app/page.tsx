"use client"

import { useState, useEffect } from "react"

interface ReportSummary {
  filename: string
  target_url: string
  finished_at: string
  pages_crawled: number
  findings_count: number
  critical: number
  high: number
  medium: number
  low: number
}

export default function Dashboard() {
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [auditLog, setAuditLog] = useState<string[]>([])
  const [initialLoading, setInitialLoading] = useState(true)

  const loadReports = async () => {
    try {
      const res = await fetch("/api/audit")
      const data = await res.json()
      setReports(data.reports ?? [])
    } catch {}
    setInitialLoading(false)
  }

  useEffect(() => { loadReports() }, [])

  const runAudit = async () => {
    if (!url) return
    setLoading(true)
    setAuditLog([])

    try {
      const res = await fetch("/api/run-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, max_pages: 50, depth: 2 }),
      })
      const data = await res.json()
      if (data.error) {
        setAuditLog([`Error: ${data.error}`])
      } else {
        setAuditLog([
          `Audit complete!`,
          `Pages crawled: ${data.pages_crawled}`,
          `Findings: ${data.findings_count}`,
          `Report: ${data.filename}`,
        ])
        await loadReports()
      }
    } catch (err) {
      setAuditLog([`Failed: ${err instanceof Error ? err.message : "Unknown error"}`])
    }
    setLoading(false)
  }

  if (initialLoading) {
    return <main style={styles.main}><p style={styles.subtitle}>Loading dashboard...</p></main>
  }

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <h1 style={styles.title}>OpenGEO Dashboard</h1>
        <p style={styles.subtitle}>Evidence-backed AI Search Readiness Auditor</p>
      </header>

      <section style={styles.runSection}>
        <h2 style={styles.sectionTitle}>Run Audit</h2>
        <div style={styles.runForm}>
          <input
            style={styles.input}
            type="url"
            placeholder="https://example.org"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runAudit()}
          />
          <button style={styles.button} onClick={runAudit} disabled={loading}>
            {loading ? "Running..." : "Audit"}
          </button>
        </div>
        {auditLog.length > 0 && (
          <div style={styles.log}>
            {auditLog.map((line, i) => <div key={i} style={styles.logLine}>{line}</div>)}
          </div>
        )}
      </section>

      <section style={styles.stats}>
        <StatCard label="Reports" value={reports.length} color="#3b82f6" />
        <StatCard label="Total Findings" value={reports.reduce((s, r) => s + r.findings_count, 0)} color="#f59e0b" />
        <StatCard label="Critical" value={reports.reduce((s, r) => s + r.critical, 0)} color="#ef4444" />
        <StatCard label="High" value={reports.reduce((s, r) => s + r.high, 0)} color="#f97316" />
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Audit Reports</h2>
        {reports.length === 0 ? (
          <div style={styles.empty}>
            <p>No audit reports yet. Run your first audit above.</p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Target</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Pages</th>
                <th style={styles.th}>Findings</th>
                <th style={styles.th}>Critical</th>
                <th style={styles.th}>High</th>
                <th style={styles.th}>Medium</th>
                <th style={styles.th}>Low</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.filename} style={styles.tr}>
                  <td style={styles.td}>{r.target_url}</td>
                  <td style={styles.td}>{new Date(r.finished_at).toLocaleDateString()}</td>
                  <td style={styles.td}>{r.pages_crawled}</td>
                  <td style={styles.td}>{r.findings_count}</td>
                  <td style={{ ...styles.td, color: "#ef4444", fontWeight: "bold" }}>{r.critical}</td>
                  <td style={{ ...styles.td, color: "#f97316" }}>{r.high}</td>
                  <td style={{ ...styles.td, color: "#3b82f6" }}>{r.medium}</td>
                  <td style={{ ...styles.td, color: "#6b7280" }}>{r.low}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ ...styles.statCard, borderLeft: `4px solid ${color}` }}>
      <span style={{ ...styles.statValue, color }}>{value}</span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: { maxWidth: 1200, margin: "0 auto", padding: "2rem", fontFamily: "system-ui, -apple-system, sans-serif" },
  header: { marginBottom: "2rem" },
  title: { fontSize: "1.8rem", fontWeight: 700, margin: 0 },
  subtitle: { color: "#6b7280", margin: "0.25rem 0 0" },
  runSection: { background: "#fff", borderRadius: 8, padding: "1.5rem", marginBottom: "2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  runForm: { display: "flex", gap: "0.5rem", marginTop: "0.75rem" },
  input: { flex: 1, padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.9rem" },
  button: { padding: "0.5rem 1.5rem", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.9rem" },
  log: { marginTop: "0.75rem", padding: "0.5rem", background: "#f9fafb", borderRadius: 4 },
  logLine: { fontSize: "0.85rem", fontFamily: "monospace", color: "#374151" },
  stats: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" },
  statCard: { background: "#fff", borderRadius: 8, padding: "1rem 1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column" },
  statValue: { fontSize: "1.8rem", fontWeight: 700 },
  statLabel: { fontSize: "0.8rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" },
  section: { background: "#fff", borderRadius: 8, padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  sectionTitle: { fontSize: "1.1rem", fontWeight: 600, margin: "0 0 1rem" },
  empty: { textAlign: "center", padding: "2rem", color: "#6b7280" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "0.75rem", borderBottom: "2px solid #e5e7eb", fontSize: "0.8rem", color: "#6b7280", textTransform: "uppercase" },
  td: { padding: "0.75rem", borderBottom: "1px solid #f3f4f6", fontSize: "0.9rem" },
  tr: { cursor: "pointer" },
}
