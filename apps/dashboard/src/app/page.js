export default function Home() {
    return (<main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>OpenGEO Dashboard</h1>
      <p>Evidence-backed AI Search Readiness Auditor</p>
      <p style={{ color: "#666" }}>
        Dashboard UI coming in Phase 3. Use the CLI for now:
      </p>
      <code style={{ display: "block", padding: "1rem", background: "#f5f5f5", borderRadius: "4px" }}>
        npx @opengeo/cli audit https://example.org
      </code>
    </main>);
}
//# sourceMappingURL=page.js.map