# Release verification

LaunchProof does not treat implementation as release verification. A v1 release candidate must be exercised from a clean, networked machine with the supported toolchain, and the exact commit proposed for release must produce evidence that is reviewed before tagging.

## Runtime lanes

LaunchProof 1.0 uses Node.js 24.x LTS as the baseline and Node.js 26.x as a required forward-compatibility lane. Public CI must pass both.

From a clean checkout:

```bat
node scripts\verify-release.mjs --bootstrap
```

After the lockfile is committed:

```bat
node scripts\verify-release.mjs
```

Browser and Docker surfaces:

```bat
node scripts\verify-release.mjs --e2e --docker
```

The harness writes gate logs and generated reports under `.launchproof/verification/<timestamp>` and stops at the first failed gate. A failed checkpoint is evidence to diagnose and repair; it is never converted into a pass.

## Baseline gates

The baseline verifies:

- Git provenance where `.git` is present;
- npm/runtime diagnostics;
- reproducible dependency installation;
- Prettier;
- ESLint;
- TypeScript project references;
- Vitest;
- production Next.js build;
- production CLI build;
- npm package dry-run;
- controlled production-reference analysis;
- controlled missing-tenant-authorization regression;
- Senten integration-contract scenario;
- LaunchProof self-analysis.

Optional flags add:

- Playwright/Chromium;
- Docker build;
- Docker Compose configuration validation.

## Release-only checkpoints

The baseline is necessary but not sufficient for `v1.0.0`. The release gate additionally requires:

1. **Real scanner evidence**
   - Semgrep result ingestion;
   - Gitleaks result ingestion with secret redaction;
   - OSV dependency-result ingestion;
   - Trivy vulnerability/secret-result ingestion.

2. **Isolated runner**
   - explicit authorization required;
   - host-owned image allowlist;
   - digest-pinned image;
   - read-only source mount;
   - dropped capabilities;
   - no-new-privileges;
   - resource/time/output bounds;
   - network disabled unless a separately configured restricted-egress implementation exists.

3. **Desktop**
   - Windows Tauri build;
   - local repository validation;
   - LaunchProof CLI operation;
   - Senten allowlisted operations;
   - npm `.cmd` shim handling;
   - no arbitrary executable/argument path from the webview.

4. **Distribution**
   - CLI tarball;
   - GHCR image;
   - Windows installer/bundle;
   - SHA-256 checksums;
   - CycloneDX SBOM;
   - fresh-install smoke test.

5. **Exact-commit self analysis**
   - the proposed release commit is analyzed by LaunchProof;
   - report provenance identifies that commit;
   - blockers/conditions are reviewed;
   - known limitations are documented.

## Human gate

Only after the required evidence is reviewed should the exact commit be tagged `v1.0.0`.

The release workflow is intentionally tag-gated. Pushing a `v1.*` tag triggers artifact construction, GHCR publication and GitHub Release creation. Do not create the stable tag merely to test the workflow; use workflow dispatch for candidate artifact builds.

## Security note

Dependency installation uses `--ignore-scripts` during verification. If a dependency later requires an install lifecycle script, that change must be reviewed and explicitly authorized rather than silently weakening the boundary.
