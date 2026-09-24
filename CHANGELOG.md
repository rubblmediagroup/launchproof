# Changelog

All notable changes to LaunchProof are documented here. Stable public releases follow semantic versioning.

## 1.0.0 - Release candidate

### Product

- Promoted LaunchProof from the v0.2 architecture milestone to the first public v1 product release program.
- Web assurance workspace with release decision, domain scores, release gates, controls, Assurance Cases, findings, evidence, System Map, regression comparison, history, intelligence policy and limitations.
- Added explicit product-mode onboarding for Web, Desktop and CLI/CI.
- Added a “Why this decision” surface that exposes failed, partial and unknown controls plus VERIFIED evidence instead of hiding uncertainty.
- Added deterministic Intended ↔ Observed architecture reconciliation states: MATCHED, UNOBSERVED, UNDECLARED, VIOLATION and UNKNOWN.

### Senten

- Senten remains an independent product and is the first official LaunchProof platform adapter.
- Commit-bound `launchproof-evidence/v1` interchange remains fail-closed on mismatched provenance.
- Imported upstream VERIFIED certainty is downgraded until LaunchProof independently verifies the guarantee.
- Senten intended architecture and invariants are normalized into the Application Security Graph.
- Dedicated UI exposes Senten evidence and architecture reconciliation.

### Desktop

- Tauri 2 desktop shell exposes fixed LaunchProof, Senten, Git and Docker operations through a narrow native bridge.
- Added `launchproof.analyze` and `launchproof.version` operations.
- Added Windows support for fixed npm-installed `.cmd` shims without exposing webview-controlled executable names or arguments.
- Repository paths are canonicalized and command output remains bounded and time-limited.

### Core assurance

- Typed immutable evidence provenance, Findings, Application Security Graph, LP-01 through LP-20 controls, Assurance Cases, strict policy and deterministic Release Confidence.
- Bounded non-executing repository snapshots with traversal, symlink, size and hostile-input protections.
- TypeScript/JavaScript AST-aware Next.js analysis plus deterministic SQL, Supabase, environment, workflow, configuration and test discovery.
- Normalization adapters for Semgrep, Gitleaks, OSV and Trivy outputs.
- Explicit isolated-verification runner boundary with authorization, host-owned image allowlist, digest-pinned images, read-only mounts, dropped capabilities, resource/time/output bounds and network-off defaults.
- Provider-independent optional AI adapters with source-transmission policy enforcement. AI cannot pass controls or release gates.

### Distribution and release engineering

- Node.js 24 LTS baseline with Node.js 26 forward-compatibility verification.
- Cross-platform v1 release harness with controlled reference, regression, Senten and self-analysis scenarios.
- GitHub Actions release workflow builds CLI artifacts, CycloneDX SBOM, SHA-256 checksums, Windows Tauri bundles and GHCR images.
- Stable tag `v1.0.0` remains behind the final human release gate.

### Release-gate status

The code is currently `1.0.0-rc.1`, not yet the stable release. Before `v1.0.0`, all mandatory CI and machine checkpoints in `docs/release-verification.md` and `docs/v1-release-checklist.md` must be green.

## 0.2.0 - Architecture milestone

- Established the modular monorepo, evidence model, application graph, assurance controls, policy engine, scoring model, scanner adapters, optional AI integration, CLI, Docker/web surface and initial Tauri shell.
- Established “Evidence before AI”, “Unknown ≠ Passed” and commit-bound release-evidence principles.

## 0.1.0 - Foundation

- Initial safe repository snapshot reader and TypeScript/Next.js/Supabase-aware analyzer.
- Initial Evidence, Finding, graph, LP-01..LP-20 catalog, policy, Assurance Case and deterministic scoring foundation.
- Initial CLI, Showcase Mode, web report and Docker path.
