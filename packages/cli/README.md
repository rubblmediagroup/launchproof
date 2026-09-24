# @launchproof/cli

Command-line interface for [LaunchProof](https://github.com/rubblmediagroup/launchproof), the evidence-driven software assurance platform.

## Install

LaunchProof 1.0 targets Node.js 24 LTS and supports Node.js 26 as a forward-compatibility lane.

```bash
npm install -g @launchproof/cli
```

Until the npm package is explicitly published, use the package artifact attached to the GitHub release.

## Analyze

```bash
launchproof analyze .
launchproof analyze . --json .launchproof/report.json
launchproof analyze . --sarif .launchproof/report.sarif
```

Scanner results can be normalized without allowing LaunchProof to execute those scanners:

```bash
launchproof analyze . \
  --scanner semgrep-json:semgrep.json \
  --scanner gitleaks-json:gitleaks.json \
  --scanner osv-json:osv.json \
  --scanner trivy-json:trivy.json
```

## Verify

Dynamic verification is opt-in and fails closed. It requires explicit invocation authorization and a host-owned runner-image allowlist.

```bash
launchproof verify . --allow-execution --runner-image sha256:<image-id>
```

Ordinary static analysis does not execute repository scripts, tests, builds, binaries or Dockerfiles.

## Report

```bash
launchproof report .launchproof/report.json
launchproof report .launchproof/report.json --format json
launchproof report .launchproof/report.json --format sarif
```

## Exit codes for `verify`

- `0` — READY
- `1` — READY_WITH_CONDITIONS or REVIEW_REQUIRED
- `2` — BLOCKED or INCOMPLETE
- `3` — invocation, configuration or analysis error

A LaunchProof report is evidence about a specific snapshot and toolchain. It is not permanent security certification.

License: Apache-2.0.
