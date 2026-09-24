# Roadmap

## v0.2 PRD implementation

The PRD v0.2 architecture is represented in the current implementation: deep TypeScript/Next.js/Supabase static inspection, scanner adapters, isolated verification abstraction/runner, all LP-01..LP-20 control evaluators, Assurance Cases, deterministic scoring, regression comparison, provider-independent intelligence, CLI/SARIF, Docker distribution, Showcase UI and an experimental Tauri shell.

## Next depth work

These are post-PRD capability expansions rather than prerequisites for the v0.2 architecture:

1. interprocedural TypeScript dataflow and import/call graph resolution;
2. browser-driven accessibility and HTTP verification profiles;
3. signed scanner/runner provenance and attestations;
4. additional framework extensions: Django, FastAPI, Laravel, Firebase, AWS;
5. richer persistent multi-user analysis history for team deployments;
6. SBOM ingestion and supply-chain attestations;
7. CodeQL adapter where licensing/execution environment makes it appropriate;
8. desktop packaging/release automation on Windows/macOS/Linux;
9. community extension SDK/versioning stabilization;
10. additional ThomasDSCX Labs authorized projects.

## v0.2 release map

- 8.0 Extension Contract Stabilization + Senten adapter — implemented; native Windows command packaging pending checkpoint.
- 8.1 Reproducible dependency/toolchain baseline — human-machine checkpoint.
- 8.2 Core assurance hardening — next AUTO phase after toolchain baseline or dependency-independent hardening where possible.
- 8.3 Scanner + isolated-runner validation — AUTO + machine checkpoint.
- 8.4 Product/E2E release validation — AUTO + browser checkpoint.
- 8.5 Distribution/fresh-install validation — AUTO + machine checkpoint.
- 8.6 Public OSS/release hardening — AUTO.
- 8.7 Release-candidate gate — HUMAN_GATE before tagging v0.2.0.
