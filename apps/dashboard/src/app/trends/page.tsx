"use client"

import { useState, useEffect } from "react"

interface TrendPoint {
  date: string
  findings_count: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
}

interface AuditSummary {
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

export default function Trends() {
  const [reports, setReports] = useState<AuditSummary[]>([])
  const [selectedUrl, setSelectedUrl] = useState<string>("")
  const [trends, setTrends] = useState<TrendPoint[]>([])
  const [compareA, setCompareA] = useState("")
  const [compareB, setCompareB] = useState("")
  const [comparison, setComparison] = useState<any>(null)

  useEffect(() => {
    fetch("/api/audit")
      .then((r) => r.json())
      .then((data) => {
        setReports(data.reports ?? [])
        const urls = [...new Set((data.reports ?? []).map((r: AuditSummary) => r.target_url))]
        if (urls.length > 0) setSelectedUrl(urls[0] as string)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedUrl) return
    const urlReports = reports
      .filter((r) => r.target_url === selectedUrl)
      .sort((a, b) => new Date(a.finished_at).getTime() - new Date(b.finished_at).getTime())
      .map((r) => ({
        date: new Date(r.finished_at).toLocaleDateString(),
        findings_count: r.findings_count,
        critical_count: r.critical,
        high_count: r.high,
        medium_count: r.medium,
        low_count: r.low,
      }))
    setTrends(urlReports)
  }, [selectedUrl, reports])

  const compareReports = async () => {
    if (!compareA || !compareB) return
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/report/${compareA}`).then((r) => r.json()),
        fetch(`/api/report/${compareB}`).then((r) => r.json()),
      ])

      const findingsA = new Map((resA.report?.findings || []).map((f: any) => [f.id + f.evidence.url, f]))
      const findingsB = new Map((resB.report?.findings || []).map((f: any) => [f.id + f.evidence.url, f]))

      const newFindings = [...findingsB.keys()].filter((k) => !findingsA.has(k))
      const resolvedFindings = [...findingsA.keys()].filter((k) => !findingsB.has(k))

      setComparison({
        new_count: newFindings.length,
        resolved_count: resolvedFindings.length,
        total_a: findingsA.size,
        total_b: findingsB.size,
      })
    } catch {}
  }

  const maxFindings = Math.max(...trends.map((t) => t.findings_count), 1)

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <h1 style={styles.title}>Trends & Comparison</h1>
        <p style={styles.subtitle}>Track AI Search Readiness over time</p>
      </header>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>URL Filter</h2>
        <select style={styles.select} value={selectedUrl} onChange={(e) => setSelectedUrl(e.target.value)}>
          {[...new Set(reports.map((r) => r.target_url))].map((url) => (
            <option key={url} value={url}>{url}</option>
          ))}
        </select>
      </section>

      {trends.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Findings Over Time</h2>
          <div style={styles.chart}>
            {trends.map((point, i) => (
              <div key={i} style={styles.chartColumn}>
                <div style={styles.chartBars}>
                  <div
                    style={{
                      ...styles.chartBar,
                      height: `${(point.critical_count / maxFindings) * 150}px`,
                      background: "#ef4444",
                    }}
                    title={`Critical: ${point.critical_count}`}
                  />
                  <div
                    style={{
                      ...styles.chartBar,
                      height: `${(point.high_count / maxFindings) * 150}px`,
                      background: "#f97316",
                    }}
                    title={`High: ${point.high_count}`}
                  />
                  <div
                    style={{
                      ...styles.chartBar,
                      height: `${(point.medium_count / maxFindings) * 150}px`,
                      background: "#3b82f6",
                    }}
                    title={`Medium: ${point.medium_count}`}
                  />
                  <div
                    style={{
                      ...styles.chartBar,
                      height: `${(point.low_count / maxFindings) * 150}px`,
                      background: "#6b7280",
                    }}
                    title={`Low: ${point.low_count}`}
                  />
                </div>
                <span style={styles.chartLabel}>{point.date}</span>
                <span style={styles.chartValue}>{point.findings_count}</span>
              </div>
            ))}
          </div>
          <div style={styles.chartLegend}>
            <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: "#ef4444" }} /> Critical</span>
            <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: "#f97316" }} /> High</span>
            <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: "#3b82f6" }} /> Medium</span>
            <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: "#6b7280" }} /> Low</span>
          </div>
        </section>
      )}

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Before / After Comparison</h2>
        <div style={styles.compareRow}>
          <select style={styles.select} value={compareA} onChange={(e) => setCompareA(e.target.value)}>
            <option value="">Select first report...</option>
            {reports.filter((r) => r.target_url === selectedUrl).map((r) => (
              <option key={r.filename} value={r.filename}>
                {new Date(r.finished_at).toLocaleString()} ({r.findings_count} findings)
              </option>
            ))}
          </select>
          <span style={styles.vs}>vs</span>
          <select style={styles.select} value={compareB} onChange={(e) => setCompareB(e.target.value)}>
            <option value="">Select second report...</option>
            {reports.filter((r) => r.target_url === selectedUrl).map((r) => (
              <option key={r.filename} value={r.filename}>
                {new Date(r.finished_at).toLocaleString()} ({r.findings_count} findings)
              </option>
            ))}
          </select>
          <button style={styles.button} onClick={compareReports}>Compare</button>
        </div>

        {comparison && (
          <div style={styles.comparisonResult}>
            <div style={styles.comparisonCard}>
              <span style={styles.comparisonNumber}>{comparison.total_a}</span>
              <span style={styles.comparisonLabel}>Before</span>
            </div>
            <div style={styles.comparisonArrow}>→</div>
            <div style={styles.comparisonCard}>
              <span style={styles.comparisonNumber}>{comparison.total_b}</span>
              <span style={styles.comparisonLabel}>After</span>
            </div>
            <div style={styles.comparisonStats}>
              <span style={{ color: "#22c55e" }}>+{comparison.resolved_count} resolved</span>
              <span style={{ color: "#ef4444" }}>+{comparison.new_count} new</span>
            </div>
          </div>
        )}
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Audit History</h2>
        <table style={styles.table}>
          <thead>
            <tr>
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
            {reports.filter((r) => !selectedUrl || r.target_url === selectedUrl).slice(0, 20).map((r) => (
              <tr key={r.filename} style={styles.tr}>
                <td style={styles.td}>{new Date(r.finished_at).toLocaleString()}</td>
                <td style={styles.td}>{r.pages_crawled}</td>
                <td style={styles.td}>{r.findings_count}</td>
                <td style={{ ...styles.td, color: "#ef4444" }}>{r.critical}</td>
                <td style={{ ...styles.td, color: "#f97316" }}>{r.high}</td>
                <td style={{ ...styles.td, color: "#3b82f6" }}>{r.medium}</td>
                <td style={{ ...styles.td, color: "#6b7280" }}>{r.low}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: { maxWidth: 1200, margin: "0 auto", padding: "2rem", fontFamily: "system-ui, -apple-system, sans-serif" },
  header: { marginBottom: "1.5rem" },
  title: { fontSize: "1.6rem", fontWeight: 700, margin: 0 },
  subtitle: { color: "#6b7280", margin: "0.25rem 0 0" },
  section: { background: "#fff", borderRadius: 8, padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  sectionTitle: { fontSize: "1.1rem", fontWeight: 600, margin: "0 0 1rem" },
  select: { padding: "0.4rem 0.75rem", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.85rem", minWidth: 200 },
  chart: { display: "flex", alignItems: "flex-end", gap: "1rem", height: 220, padding: "1rem 0", borderBottom: "1px solid #e5e7eb" },
  chartColumn: { display: "flex", flexDirection: "column", alignItems: "center", flex: 1 },
  chartBars: { display: "flex", alignItems: "flex-end", gap: 2, height: 160 },
  chartBar: { width: 12, borderRadius: 2, minHeight: 2 },
  chartLabel: { fontSize: "0.7rem", color: "#6b7280", marginTop: "0.25rem" },
  chartValue: { fontSize: "0.75rem", fontWeight: 600, color: "#374151" },
  chartLegend: { display: "flex", gap: "1rem", marginTop: "0.75rem", justifyContent: "center" },
  legendItem: { display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: "#6b7280" },
  legendDot: { width: 8, height: 8, borderRadius: "50%", display: "inline-block" },
  compareRow: { display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" },
  vs: { fontWeight: 600, color: "#6b7280" },
  button: { padding: "0.5rem 1.5rem", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.9rem" },
  comparisonResult: { display: "flex", alignItems: "center", gap: "1.5rem", marginTop: "1rem", padding: "1rem", background: "#f9fafb", borderRadius: 8 },
  comparisonCard: { display: "flex", flexDirection: "column", alignItems: "center" },
  comparisonNumber: { fontSize: "2rem", fontWeight: 700, color: "#111827" },
  comparisonLabel: { fontSize: "0.8rem", color: "#6b7280" },
  comparisonArrow: { fontSize: "1.5rem", color: "#6b7280" },
  comparisonStats: { display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "0.75rem", borderBottom: "2px solid #e5e7eb", fontSize: "0.8rem", color: "#6b7280", textTransform: "uppercase" },
  td: { padding: "0.75rem", borderBottom: "1px solid #f3f4f6", fontSize: "0.9rem" },
  tr: {},
}
