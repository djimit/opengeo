# Contributing to OpenGEO

## Getting Started

```bash
git clone https://github.com/DjimIT/opengeo.git
cd opengeo
pnpm install
pnpm build
```

## Development

```bash
# Build all packages
pnpm build

# Run tests
pnpm test

# Type check
pnpm type-check

# Run the CLI locally
pnpm --filter @opengeo/cli exec node dist/index.js audit https://example.org
```

## Adding a New Rule

1. Create a new rule file in the appropriate `rules/` subdirectory
2. Register it in `apps/cli/src/rules.ts`
3. Add test fixtures in `fixtures/sites/`
4. Write an RFC in `rules/rfc/`
5. Update the rule count in `README.md`

### Rule Template

```typescript
engine.register({
  id: "GEO-CATEGORY-001",  // Unique ID: GEO-{CATEGORY}-{SEQUENCE}
  category: "crawlability",
  title: "Short descriptive title",
  description: "What this rule checks and why",
  enabled: true,
  evaluate(ctx) {
    const findings: Finding[] = []
    // Your logic here
    return findings
  },
})
```

### Finding Requirements

Every finding **must** include:

- Unique `id` matching the pattern `GEO-[A-Z]+-\d{3}`
- `evidence` with at least a `url` and `snippet`
- `impact` assessment across all four dimensions
- `recommendation` with action, rationale, and effort estimate
- At least one `source` with vendor, type, and optional URL
- `rule_metadata` with status, evidence level, and maintainer

## Testing

Every rule must have:

1. A positive test case (rule fires correctly)
2. A negative test case (rule does not fire on valid pages)
3. An edge case (boundary condition)

## Code Style

- TypeScript strict mode
- No comments unless explaining "why" (not "what")
- Zod schemas for all data boundaries
- ESM modules only

## License

By contributing, you agree your contributions will be licensed under Apache-2.0.
