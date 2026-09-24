# Release verification

LaunchProof does not treat implementation as release verification. A release candidate must be exercised from a clean, networked machine with the supported toolchain.

## Windows runtime lanes

LaunchProof v0.2 uses Node.js 24.x LTS as the release-verification baseline and Node.js 26.x as a required forward-compatibility lane. The local harness accepts either runtime; public CI must pass both. From a clean checkout, the first run creates the genuine npm lockfile and records each gate under `.launchproof/verification/<timestamp>`:

```bat
node scripts\verify-release.mjs --bootstrap
```

After the resulting `package-lock.json` is reviewed and committed, fresh-install verification uses `npm ci`:

```bat
node scripts\verify-release.mjs
```

Browser and Docker gates can be enabled explicitly:

```bat
node scripts\verify-release.mjs --e2e --docker
```

The canonical Node harness runs directly from Command Prompt, PowerShell, bash, or CI and stops on the first failed gate. The PowerShell wrapper remains available for Windows users who prefer it. A failed checkpoint is evidence to diagnose and repair; it must not be converted into a pass.

## What the baseline proves

The baseline runs formatting, linting, TypeScript project checking, the Vitest suite, the production web build, compiled CLI/npm package dry-run, both controlled CLI scenarios, and LaunchProof self-analysis. Optional flags add Playwright/Chromium and Docker build/Compose validation.

It does **not** by itself prove scanner execution or isolated dynamic verification. Those require their own authorized checkpoint with real Semgrep/Gitleaks/OSV/Trivy outputs and pinned runner images.

## Security note

The bootstrap uses `npm install --ignore-scripts` to avoid package lifecycle execution during dependency retrieval. Subsequent clean installs use `npm ci --ignore-scripts`. If a dependency later requires an installation script, review and authorize that change explicitly rather than silently removing the protection.
