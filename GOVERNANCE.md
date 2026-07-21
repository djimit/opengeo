# OpenGEO Governance

## Rule Ownership

Each rule has a designated maintainer responsible for:

- Accuracy of the rule's logic and evidence
- Keeping vendor references up to date
- Reviewing the rule at least quarterly
- Updating `last_reviewed` date in rule metadata

## Rule Lifecycle

```
draft → experimental → verified → deprecated → archived
```

| Status | Meaning |
|--------|---------|
| `draft` | Initial implementation, not yet tested against corpus |
| `experimental` | Implemented, limited real-world validation |
| `verified` | Tested against corpus, passes discrimination gate |
| `deprecated` | Superseded by newer rule or vendor policy change |
| `archived` | No longer applicable |

## Rule RFC Process

1. New rules are proposed via RFC in `rules/rfc/`
2. RFC includes: problem statement, expected behavior, oracle definition, test cases
3. Community review period: 14 days
4. Maintainer merges or requests changes
5. Rule enters `experimental` status, then `verified` after corpus validation

## CODEOWNERS

Rules are owned by working groups:

```
/rules/crawlability/      @opengeo/search-working-group
/rules/structured-data/   @opengeo/structured-data-working-group
/rules/content/           @opengeo/content-working-group
/rules/citations/         @opengeo/citations-working-group
/rules/entities/          @opengeo/entities-working-group
/rules/accessibility/     @opengeo/a11y-working-group
/rules/performance/       @opengeo/performance-working-group
/rules/security/          @opengeo/security-working-group
```

## Vendor Claims Register

All vendor claims are tracked in `docs/vendor-claims/` with:

- Claim text
- Source URL
- Date verified
- Reproduction steps
- Status (verified / disputed / outdated)

Claims older than 12 months without re-verification are automatically flagged.

## Release Process

- Semantic versioning (SemVer)
- Signed releases with SLSA provenance
- SBOM included in every release
- Changelog per rule addition/modification
