import Link from "next/link"

export const metadata = {
  title: "OpenGEO Dashboard",
  description: "Evidence-backed AI Search Readiness Auditor",
}

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/explorer", label: "Explorer" },
  { href: "/graph", label: "Entity Graph" },
  { href: "/trends", label: "Trends" },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f9fafb", minHeight: "100vh" }}>
        <nav style={navStyles}>
          <span style={logoStyles}>OpenGEO</span>
          <div style={linksStyles}>
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} style={linkStyles}>
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}

const navStyles: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0.75rem 2rem",
  background: "#fff",
  borderBottom: "1px solid #e5e7eb",
}

const logoStyles: React.CSSProperties = {
  fontSize: "1.2rem",
  fontWeight: 700,
  color: "#3b82f6",
}

const linksStyles: React.CSSProperties = {
  display: "flex",
  gap: "1.5rem",
}

const linkStyles: React.CSSProperties = {
  color: "#374151",
  textDecoration: "none",
  fontSize: "0.9rem",
  fontWeight: 500,
}
