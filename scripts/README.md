# Verification helpers

`offline-smoke.mts` exercises the dependency-light deterministic engine against both controlled source scenarios. It exists so core evidence/assurance behavior can still be sanity-checked in restricted environments where package installation is unavailable. Normal development should use the Vitest suite.

## Windows release candidate harness

`verify-release.ps1` is the release-candidate baseline harness. It accepts Node 24.x (LTS baseline) or Node 26.x (forward-compatibility lane), captures per-gate logs under `.launchproof/verification`, and stops at the first failed gate. Use `-Bootstrap` only for the first networked run that creates the genuine npm lockfile; use the default `npm ci` path after the lockfile is committed. `-WithE2E` and `-WithDocker` opt into browser and container gates.

## Cross-platform RC harness

`verify-release.mjs` is the canonical release-candidate harness and runs directly under the supported Node runtime from Command Prompt, PowerShell, bash, or CI. Use `node scripts/verify-release.mjs --bootstrap` for the first lockfile-generating run; add `--e2e` and/or `--docker` for those gates. The PowerShell wrapper is retained for convenience.
