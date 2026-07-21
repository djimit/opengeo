"use client"

import { useState, useEffect, useCallback } from "react"

interface Finding {
  id: string
  title: string
  category: string
  severity: "critical" | "high" | "medium" | "low"
  confidence: string
  evidence: { url: string; snippet?: string; lines?: string[] }
  impact: { search: string; ai_retrieval: string; model_training: string; user_experience: string }
  recommendation: { action: string; rationale: string; effort: string }
  patch?: { format: string; content: string; target_file?: string }
  sources: Array<{ vendor: string; type: string; url?: string }>
}

interface Report {
  metadata: { target_url: string; finished_at: string; pages_crawled: number; rules_evaluated: number }
  findings: Finding[]
}

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }
const SEVERITY_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#3b82f6", low: "#6b7280" }
const CATEGORIES = ["all", "crawlability", "structured-data", "content", "citations", "entities", "security", "performance", "governance"]

export default function Explorer() {
  const [report, setReport] = useState<Report | null>(null)
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterSeverity, setFilterSeverity] = useState("all")
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState("")

  const loadReport = useCallback(async (filename: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/report/${filename}`)
      const data = await res.json()
      setReport(data.report)
      setSelectedFinding(null)
    } catch {}
    setLoading(false)
  }, [])

  const runAudit = useCallback(async () => {
    if (!url) return
    setLoading(true)
    try {
      const res = await fetch("/api/run-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, max_pages: 50, depth: 2 }),
      })
      const data = await res.json()
      if (data.filename) {
        await loadReport(data.filename)
      }
    } catch {}
    setLoading(false)
  }, [url, loadReport])

  useEffect(() => {
    fetch("/api/audit")
      .then((r) => r.json())
      .then((data) => {
        if (data.reports?.length > 0) {
          loadReport(data.reports[0].filename)
        }
      })
      .catch(() => {})
  }, [loadReport])

  if (loading) {
    return <main style={styles.main}><p>Loading...</p></main>
  }

  if (!report) {
    return (
      <main style={styles.main}>
        <h1 style={styles.title}>Crawl Explorer</h1>
        <p style={styles.subtitle}>No reports loaded. Run an audit first:</p>
        <div style={styles.runForm}>
          <input
            style={styles.input}
            type="url"
            placeholder="https://example.org"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button style={styles.button} onClick={runAudit}>Run Audit</button>
        </div>
      </main>
    )
  }

  const findings = report.findings.filter((f) => {
    if (filterCategory !== "all" && f.category !== filterCategory) return false
    if (filterSeverity !== "all" && f.severity !== filterSeverity) return false
    return true
  }).sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <h1 style={styles.title}>Crawl Explorer</h1>
        <p style={styles.subtitle}>
          {report.metadata.target_url} — {report.metadata.pages_crawled} pages — {report.findings.length} findings
        </p>
      </header>

      <div style={styles.filters}>
        <select style={styles.select} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>)}
        </select>
        <select style={styles.select} value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <span style={styles.count}>{findings.length} findings</span>
      </div>

      <div style={styles.split}>
        <div style={styles.list}>
          {findings.map((f) => (
            <div
              key={f.id + f.evidence.url}
              style={{
                ...styles.findingCard,
                borderLeft: `4px solid ${SEVERITY_COLORS[f.severity]}`,
                background: selectedFinding === f ? "#f0f9ff" : "#fff",
              }}
              onClick={() => setSelectedFinding(f)}
            >
              <div style={styles.findingHeader}>
                <code style={styles.findingId}>{f.id}</code>
                <span style={{ ...styles.severityBadge, background: SEVERITY_COLORS[f.severity] }}>
                  {f.severity}
                </span>
              </div>
              <p style={styles.findingTitle}>{f.title}</p>
              <p style={styles.findingUrl}>{f.evidence.url}</p>
            </div>
          ))}
        </div>

        <div style={styles.detail}>
          {selectedFinding ? (
            <FindingDetail finding={selectedFinding} />
          ) : (
            <p style={styles.placeholder}>Select a finding to view details</p>
          )}
        </div>
      </div>
    </main>
  )
}

function FindingDetail({ finding }: { finding: Finding }) {
  return (
    <div style={styles.detailContent}>
      <h2 style={styles.detailTitle}>{finding.title}</h2>
      <div style={styles.detailMeta}>
        <span style={{ ...styles.severityBadge, background: SEVERITY_COLORS[finding.severity] }}>
          {finding.severity}
        </span>
        <span style={styles.metaText}>Confidence: {finding.confidence}</span>
        <span style={styles.metaText}>Category: {finding.category}</span>
      </div>

      <section style={styles.detailSection}>
        <h3 style={styles.detailHeading}>Evidence</h3>
        <p style={styles.metaText}>URL: {finding.evidence.url}</p>
        {finding.evidence.snippet && <p style={styles.metaText}>{finding.evidence.snippet}</p>}
        {finding.evidence.lines?.map((line, i) => (
          <code key={i} style={styles.evidenceLine}>{line}</code>
        ))}
      </section>

      <section style={styles.detailSection}>
        <h3 style={styles.detailHeading}>Impact</h3>
        <div style={styles.impactGrid}>
          <ImpactCell label="Search" value={finding.impact.search} />
          <ImpactCell label="AI Retrieval" value={finding.impact.ai_retrieval} />
          <ImpactCell label="Model Training" value={finding.impact.model_training} />
          <ImpactCell label="User Experience" value={finding.impact.user_experience} />
        </div>
      </section>

      <section style={styles.detailSection}>
        <h3 style={styles.detailHeading}>Recommendation</h3>
        <p style={styles.metaText}>Action: <strong>{finding.recommendation.action}</strong> ({finding.recommendation.effort} effort)</p>
        <p style={styles.metaText}>{finding.recommendation.rationale}</p>
      </section>

      {finding.patch && (
        <section style={styles.detailSection}>
          <h3 style={styles.detailHeading}>Suggested Patch</h3>
          <pre style={styles.patchCode}>{finding.patch.content}</pre>
        </section>
      )}

      <section style={styles.detailSection}>
        <h3 style={styles.detailHeading}>Sources</h3>
        {finding.sources.map((s, i) => (
          <p key={i} style={styles.metaText}>
            {s.vendor} [{s.type}]{s.url ? `: ${s.url}` : ""}
          </p>
        ))}
      </section>
    </div>
  )
}

function ImpactCell({ label, value }: { label: string; value: string }) {
  const colors: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#3b82f6", none: "#d1d5db" }
  return (
    <div style={{ ...styles.impactCell, borderTop: `3px solid ${colors[value] ?? "#d1d5db"}` }}>
      <span style={{ ...styles.impactValue, color: colors[value] ?? "#6b7280" }}>{value}</span>
      <span style={styles.impactLabel}>{label}</span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: { maxWidth: 1400, margin: "0 auto", padding: "2rem", fontFamily: "system-ui, -apple-system, sans-serif" },
  header: { marginBottom: "1.5rem" },
  title: { fontSize: "1.6rem", fontWeight: 700, margin: 0 },
  subtitle: { color: "#6b7280", margin: "0.25rem 0 0" },
  runForm: { display: "flex", gap: "0.5rem", marginTop: "1rem" },
  input: { flex: 1, padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.9rem" },
  button: { padding: "0.5rem 1.5rem", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.9rem" },
  filters: { display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1.5rem" },
  select: { padding: "0.4rem 0.75rem", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.85rem" },
  count: { color: "#6b7280", fontSize: "0.85rem" },
  split: { display: "grid", gridTemplateColumns: "380px 1fr", gap: "1.5rem", minHeight: 500 },
  list: { display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "70vh", overflowY: "auto" },
  findingCard: { padding: "0.75rem 1rem", borderRadius: 6, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },
  findingHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  findingId: { fontSize: "0.75rem", color: "#6b7280" },
  severityBadge: { fontSize: "0.65rem", color: "#fff", padding: "0.15rem 0.5rem", borderRadius: 4, textTransform: "uppercase", fontWeight: 600 },
  findingTitle: { fontSize: "0.85rem", fontWeight: 500, margin: "0.25rem 0" },
  findingUrl: { fontSize: "0.75rem", color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  detail: { background: "#fff", borderRadius: 8, padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", maxHeight: "70vh", overflowY: "auto" },
  placeholder: { color: "#9ca3af", textAlign: "center", marginTop: "3rem" },
  detailContent: { display: "flex", flexDirection: "column", gap: "1.25rem" },
  detailTitle: { fontSize: "1.1rem", fontWeight: 600, margin: 0 },
  detailMeta: { display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" },
  metaText: { fontSize: "0.85rem", color: "#4b5563", margin: 0 },
  detailSection: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  detailHeading: { fontSize: "0.9rem", fontWeight: 600, margin: 0, color: "#111827" },
  evidenceLine: { display: "block", padding: "0.25rem 0.5rem", background: "#f3f4f6", borderRadius: 3, fontSize: "0.8rem", margin: "0.15rem 0" },
  impactGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" },
  impactCell: { padding: "0.5rem", textAlign: "center", background: "#f9fafb", borderRadius: 4 },
  impactValue: { display: "block", fontSize: "0.85rem", fontWeight: 600, textTransform: "capitalize" },
  impactLabel: { fontSize: "0.7rem", color: "#6b7280" },
  patchCode: { padding: "0.75rem", background: "#1f2937", color: "#e5e7eb", borderRadius: 6, fontSize: "0.8rem", overflowX: "auto", lineHeight: 1.5 },
}
