# LaunchProof v1 release checklist

This checklist is the final HUMAN_GATE for `v1.0.0`. A checked item requires evidence from the exact release candidate commit or a clearly identified supported runtime/platform.

## Source and provenance

- [ ] Exact candidate commit identified.
- [ ] Working tree clean for the release candidate.
- [ ] Package versions agree on `1.0.0`.
- [ ] Release notes and known limitations reviewed.
- [ ] No secrets or private third-party source are present.

## Node/runtime matrix

- [ ] Node 24 clean install passes.
- [ ] Node 26 clean install passes.
- [ ] `npm run format:check`.
- [ ] `npm run lint`.
- [ ] `npm run typecheck`.
- [ ] `npm test`.
- [ ] Next.js production build.
- [ ] CLI production build.
- [ ] CLI package dry-run.

## Product behavior

- [ ] Production-reference scenario analyzes successfully.
- [ ] Missing-tenant-authorization regression is detected and produces a worse assurance outcome.
- [ ] Senten integration scenario analyzes successfully.
- [ ] LaunchProof self-analysis completes.
- [ ] Release gate explanations are understandable and traceable to controls/evidence.
- [ ] System Map renders and node evidence can be inspected.
- [ ] Intended ↔ Observed Senten architecture states render correctly.
- [ ] Public Showcase does not accept arbitrary filesystem paths.

## Browser/E2E

- [ ] Playwright Chromium suite passes.
- [ ] Keyboard focus is visible on interactive controls.
- [ ] Narrow/mobile layout remains usable.
- [ ] Streaming analysis reaches a final report or fails safely.

## Scanner evidence

- [ ] Semgrep output ingests successfully.
- [ ] Gitleaks output ingests with matched secret values redacted.
- [ ] OSV output ingests successfully.
- [ ] Trivy vulnerability/secret output ingests successfully.
- [ ] Malformed/unsupported scanner output fails safely.
- [ ] Scanner result provenance remains attributed to the originating adapter/tool.

## Isolated runner

- [ ] Verification fails without explicit authorization.
- [ ] Verification fails when the host image allowlist is empty.
- [ ] Verification fails for an unapproved image.
- [ ] Verification fails for an unpinned image.
- [ ] Approved digest-pinned image runs with source read-only.
- [ ] Network is disabled by default.
- [ ] Timeout/resource/output bounds are observed.
- [ ] Restricted-network request fails closed until a real restricted-egress implementation exists.

## Senten

- [ ] Senten structured detection works.
- [ ] Commit-matched evidence imports.
- [ ] Commit-mismatched evidence fails closed.
- [ ] Upstream VERIFIED becomes at most INFERRED.
- [ ] Intended architecture imports without execution.
- [ ] MATCHED / UNOBSERVED / UNDECLARED / VIOLATION / UNKNOWN reconciliation is correct on controlled fixtures.
- [ ] Supported Senten desktop operations execute on Windows.
- [ ] Webview cannot select arbitrary executables or arguments.

## Desktop / Windows

- [ ] Tauri production build succeeds.
- [ ] Installer/bundle launches.
- [ ] Repository path validation rejects invalid/root paths.
- [ ] `launchproof.analyze` runs for a selected local repo.
- [ ] LaunchProof version diagnostic works.
- [ ] Git status diagnostic works.
- [ ] Docker diagnostic works when Docker is installed.
- [ ] npm-installed `.cmd` shim handling works.
- [ ] Output timeout and size bounds work.
- [ ] No arbitrary shell UI exists.

## Docker / self-hosting

- [ ] Docker image builds.
- [ ] `docker compose config --quiet` passes.
- [ ] Container runs as configured.
- [ ] Web container is not used as the target-code execution sandbox.
- [ ] GHCR candidate image can be pulled and started.

## Distribution artifacts

- [ ] CLI tarball generated.
- [ ] CLI fresh-install smoke test passes.
- [ ] Windows desktop bundle generated.
- [ ] CycloneDX SBOM generated.
- [ ] SHA-256 checksums generated and verified.
- [ ] GitHub Release draft content reviewed.
- [ ] GHCR tag naming reviewed.

## Exact-commit assurance

- [ ] LaunchProof self-report references the exact release commit.
- [ ] No unresolved BLOCKED status is being hidden.
- [ ] Conditions/limitations are accurately represented.
- [ ] Evidence files from CI/machine checkpoints are archived or linked.

## HUMAN_GATE

Only after every release-required item is satisfied:

- [ ] Merge the v1 release-candidate PR.
- [ ] Create signed/annotated `v1.0.0` tag where practical.
- [ ] Push the tag.
- [ ] Confirm the release workflow completes.
- [ ] Verify published GitHub Release assets and GHCR image.
- [ ] Mark the release public.
