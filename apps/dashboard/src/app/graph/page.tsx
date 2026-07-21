"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface GraphNode {
  id: string
  type: string
  name: string
  x: number
  y: number
  vx: number
  vy: number
  links: string[]
}

interface GraphData {
  nodes: GraphNode[]
  edges: Array<{ source: string; target: string }>
}

const TYPE_COLORS: Record<string, string> = {
  Organization: "#3b82f6",
  Person: "#22c55e",
  Article: "#f59e0b",
  Product: "#a855f7",
  Service: "#ec4899",
  WebSite: "#06b6d4",
  WebPage: "#6b7280",
  BreadcrumbList: "#84cc16",
  FAQPage: "#f97316",
  HowTo: "#14b8a6",
  Dataset: "#6366f1",
  DefinedTerm: "#8b5cf6",
}

export default function EntityGraph() {
  const [report, setReport] = useState<any>(null)
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const [loading, setLoading] = useState(false)
  const [filename, setFilename] = useState("")
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const loadReport = async (fname: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/report/${fname}`)
      const data = await res.json()
      setReport(data.report)
      buildGraph(data.report)
    } catch {}
    setLoading(false)
  }

  const buildGraph = useCallback((reportData: any) => {
    const nodes: GraphNode[] = []
    const edges: Array<{ source: string; target: string }> = []
    const seen = new Set<string>()

    if (!reportData?.findings) {
      setGraph({ nodes: [], edges: [] })
      return
    }

    // Extract entities from JSON-LD in findings evidence
    for (const finding of reportData.findings) {
      const jsonLdMatch = finding.evidence?.raw || finding.evidence?.snippet || ""
      // Look for entity references in the finding
      if (finding.category === "entities" || finding.category === "structured-data") {
        const id = finding.id + "-" + finding.evidence.url
        if (!seen.has(id)) {
          seen.add(id)
          nodes.push({
            id,
            type: finding.rule_metadata?.status || "WebPage",
            name: finding.title.slice(0, 40),
            x: 200 + Math.random() * 400,
            y: 200 + Math.random() * 300,
            vx: 0,
            vy: 0,
            links: [],
          })
        }
      }
    }

    // If no entities found, create a placeholder from report metadata
    if (nodes.length === 0 && reportData.metadata) {
      nodes.push({
        id: "site-root",
        type: "WebSite",
        name: new URL(reportData.metadata.target_url).hostname,
        x: 400,
        y: 300,
        vx: 0,
        vy: 0,
        links: [],
      })
    }

    // Create edges between nodes of same category
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i]!.type === nodes[j]!.type || Math.random() < 0.1) {
          edges.push({ source: nodes[i]!.id, target: nodes[j]!.id })
          nodes[i]!.links.push(nodes[j]!.id)
          nodes[j]!.links.push(nodes[i]!.id)
        }
      }
    }

    setGraph({ nodes, edges })
  }, [])

  // Force simulation
  useEffect(() => {
    if (!graph || graph.nodes.length === 0) return

    const iterations = 100
    const decay = 0.95
    const repulsion = 5000
    const attraction = 0.01

    let sim = { ...graph }

    for (let iter = 0; iter < iterations; iter++) {
      // Repulsion between all nodes
      for (let i = 0; i < sim.nodes.length; i++) {
        for (let j = i + 1; j < sim.nodes.length; j++) {
          const dx = sim.nodes[j]!.x - sim.nodes[i]!.x
          const dy = sim.nodes[j]!.y - sim.nodes[i]!.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = repulsion / (dist * dist)
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          sim.nodes[i]!.vx -= fx
          sim.nodes[i]!.vy -= fy
          sim.nodes[j]!.vx += fx
          sim.nodes[j]!.vy += fy
        }
      }

      // Attraction along edges
      for (const edge of sim.edges) {
        const source = sim.nodes.find((n) => n.id === edge.source)
        const target = sim.nodes.find((n) => n.id === edge.target)
        if (!source || !target) continue
        const dx = target.x - source.x
        const dy = target.y - source.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = dist * attraction
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        source.vx += fx
        source.vy += fy
        target.vx -= fx
        target.vy -= fy
      }

      // Apply velocity with decay
      for (const node of sim.nodes) {
        node.vx *= decay
        node.vy *= decay
        node.x += node.vx
        node.y += node.vy
        // Keep within bounds
        node.x = Math.max(50, Math.min(750, node.x))
        node.y = Math.max(50, Math.min(550, node.y))
      }
    }

    setGraph(sim)
  }, [graph?.nodes.length])

  // Draw graph
  useEffect(() => {
    if (!graph || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw edges
    ctx.strokeStyle = "#d1d5db"
    ctx.lineWidth = 1
    for (const edge of graph.edges) {
      const source = graph.nodes.find((n) => n.id === edge.source)
      const target = graph.nodes.find((n) => n.id === edge.target)
      if (!source || !target) continue
      ctx.beginPath()
      ctx.moveTo(source.x, source.y)
      ctx.lineTo(target.x, target.y)
      ctx.stroke()
    }

    // Draw nodes
    for (const node of graph.nodes) {
      const color = TYPE_COLORS[node.type] || "#6b7280"
      ctx.beginPath()
      ctx.arc(node.x, node.y, selected?.id === node.id ? 12 : 8, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      if (selected?.id === node.id) {
        ctx.strokeStyle = "#111827"
        ctx.lineWidth = 2
        ctx.stroke()
      }
      ctx.fillStyle = "#374151"
      ctx.font = "10px system-ui"
      ctx.fillText(node.name.slice(0, 20), node.x + 12, node.y + 4)
    }
  }, [graph, selected])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!graph || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const clicked = graph.nodes.find((n) => {
      const dx = n.x - x
      const dy = n.y - y
      return Math.sqrt(dx * dx + dy * dy) < 15
    })
    setSelected(clicked || null)
  }

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <h1 style={styles.title}>Entity Graph</h1>
        <p style={styles.subtitle}>Knowledge graph visualization from structured data</p>
      </header>

      <div style={styles.controls}>
        <input
          style={styles.input}
          placeholder="Report filename (e.g., report-2026-07-20T22-41-21-000Z.json)"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
        />
        <button style={styles.button} onClick={() => loadReport(filename)} disabled={loading}>
          {loading ? "Loading..." : "Load"}
        </button>
      </div>

      <div style={styles.graphContainer}>
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          style={styles.canvas}
          onClick={handleCanvasClick}
        />
        {(!graph || graph.nodes.length === 0) && (
          <div style={styles.placeholder}>
            Load a report to visualize its entity graph
          </div>
        )}
      </div>

      {selected && (
        <div style={styles.detail}>
          <h3 style={styles.detailTitle}>{selected.name}</h3>
          <p style={styles.meta}>Type: <strong>{selected.type}</strong></p>
          <p style={styles.meta}>Connections: <strong>{selected.links.length}</strong></p>
        </div>
      )}

      <div style={styles.legend}>
        <h3 style={styles.legendTitle}>Legend</h3>
        <div style={styles.legendGrid}>
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <div key={type} style={styles.legendItem}>
              <span style={{ ...styles.legendDot, background: color }} />
              <span style={styles.legendLabel}>{type}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: { maxWidth: 1200, margin: "0 auto", padding: "2rem", fontFamily: "system-ui, -apple-system, sans-serif" },
  header: { marginBottom: "1.5rem" },
  title: { fontSize: "1.6rem", fontWeight: 700, margin: 0 },
  subtitle: { color: "#6b7280", margin: "0.25rem 0 0" },
  controls: { display: "flex", gap: "0.5rem", marginBottom: "1rem" },
  input: { flex: 1, padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.9rem" },
  button: { padding: "0.5rem 1.5rem", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.9rem" },
  graphContainer: { position: "relative", background: "#fff", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" },
  canvas: { display: "block", cursor: "pointer" },
  placeholder: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "#9ca3af" },
  detail: { marginTop: "1rem", padding: "1rem", background: "#f0f9ff", borderRadius: 8, border: "1px solid #bfdbfe" },
  detailTitle: { margin: "0 0 0.5rem", fontSize: "1rem" },
  meta: { margin: "0.25rem 0", fontSize: "0.85rem", color: "#4b5563" },
  legend: { marginTop: "1rem", padding: "1rem", background: "#fff", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  legendTitle: { fontSize: "0.9rem", fontWeight: 600, margin: "0 0 0.5rem" },
  legendGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.5rem" },
  legendItem: { display: "flex", alignItems: "center", gap: "0.4rem" },
  legendDot: { width: 10, height: 10, borderRadius: "50%", display: "inline-block" },
  legendLabel: { fontSize: "0.75rem", color: "#6b7280" },
}
