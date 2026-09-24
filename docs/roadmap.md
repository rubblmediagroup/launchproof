# LaunchProof 1.0 roadmap

LaunchProof 1.0 is the first public product release. The release bar is intentionally higher than “the code builds”: a new user must be able to install LaunchProof, analyze a repository, understand the release decision, trace it to evidence, and reproduce the result without trusting an opaque AI judgment.

## Release principles

1. **Evidence before AI.**
2. **Unknown is never converted into Passed.**
3. **Static inspection does not execute hostile repository code.**
4. **VERIFIED requires an authorized deterministic verification capable of exercising the guarantee.**
5. **Release claims are commit-bound and reproducible.**
6. **LaunchProof and Senten remain independently useful products.**

## v1 build map

### 1. Core correctness and verification — AUTO → MACHINE CHECKPOINT

- Node.js 24 LTS baseline and Node.js 26 forward-compatibility lane.
- Reproducible lockfile and clean `npm ci --ignore-scripts`.
- Prettier, ESLint, TypeScript project references, Vitest, production Next.js build and CLI bundle.
- Healthy/reference and authorization-regression scenarios.
- LaunchProof self-analysis.
- Playwright and Docker verification.
- Real scanner-result ingestion and isolated-runner checkpoint.
- Clean Windows path and npm command-shim behavior.

### 2. Product UI and explainability — AUTO → HUMAN_CHECKPOINT

- Web assurance workspace with progress, Release Confidence, release gates, controls, Assurance Cases, findings and evidence.
- “Why this decision” summary that exposes failed, partial and unknown controls instead of hiding uncertainty.
- System Map with evidence-backed trust relationships.
- Product-mode onboarding for Web, Desktop and CLI/CI.
- Before/after regression comparison and analysis history.
- Accessible keyboard/focus behavior and responsive layouts.

### 3. Desktop workflow — AUTO → MACHINE CHECKPOINT

- Tauri 2 desktop shell with a narrow native boundary.
- Local repository validation.
- Fixed LaunchProof, Senten, Git and Docker operations.
- No webview-provided executable names or arbitrary shell arguments.
- Windows support for fixed npm-installed `.cmd` shims without exposing a general terminal.
- Windows installer verification before v1.

### 4. Senten first-class integration — AUTO → MACHINE CHECKPOINT

- Versioned `launchproof-evidence/v1` interchange.
- Commit-bound imported evidence.
- External VERIFIED certainty is downgraded until LaunchProof independently verifies it.
- Intended architecture and invariants imported as normalized graph data.
- Deterministic Intended ↔ Observed architecture reconciliation with `MATCHED`, `UNOBSERVED`, `UNDECLARED`, `VIOLATION` and `UNKNOWN` states.
- Desktop allowlist for supported Senten operations.

### 5. Distribution — AUTO → MACHINE CHECKPOINT

- Compiled `@launchproof/cli` tarball.
- GitHub Release assets and SHA-256 checksums.
- GHCR image: `ghcr.io/rubblmediagroup/launchproof`.
- Windows Tauri bundle.
- Docker Compose self-hosted web distribution.
- Source remains usable without LaunchProof cloud.

### 6. Public OSS and security hardening — AUTO

- Apache-2.0 license, SECURITY, CONTRIBUTING and limitations documentation.
- Threat model, sandbox model and AI data-governance documentation.
- Release CI runs Node 24/26, E2E, Docker and package checks.
- Hostile-input bounds, secret redaction, fail-closed extension/scanner handling and isolated execution boundaries remain release gates.
- SBOM/provenance generation and dependency review in the release workflow.

### 7. v1 release evidence — HUMAN_GATE

No `v1.0.0` tag is created until all mandatory checkpoints are green.

Required release evidence:

- clean checkout on Node 24 and Node 26;
- formatter/lint/typecheck/tests/build/package;
- Playwright;
- Docker build and Compose validation;
- controlled healthy/regression scenarios;
- LaunchProof self-analysis;
- Senten integration scenario;
- real scanner normalization checkpoint;
- isolated-runner checkpoint;
- Windows desktop build/install smoke test;
- reviewed release notes, known limitations and checksums.

At the gate, LaunchProof analyzes the exact commit proposed for `v1.0.0`. The resulting report is release evidence, not permanent security certification.

## Post-1.0 depth

The following are valuable extensions, not reasons to delay a correct 1.0:

- deeper interprocedural dataflow and import/call resolution;
- Django, FastAPI, Laravel, Firebase and AWS adapters;
- signed attestations and richer SBOM ingestion;
- team/multi-user persistent history;
- macOS/Linux desktop packaging after platform-specific verification;
- extension registry/community SDK stabilization;
- richer CodeQL integration where execution/licensing permit it.
