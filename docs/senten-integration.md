# Senten integration

Status: **v1 first-class integration candidate.** LaunchProof and Senten remain independently useful products. Neither requires the other to function.

## Roles

Senten is an architecture, policy, invariant and evidence producer: it describes what the system intends to be and can emit structured evidence about its own deterministic checks.

LaunchProof is the independent assurance evaluator: it inspects what it can actually observe, correlates scanner and verification evidence, evaluates controls and Assurance Cases, and makes the release decision.

A Senten success result does **not** directly pass a LaunchProof control. Imported `VERIFIED` certainty is downgraded to `INFERRED`; only an explicitly authorized LaunchProof verification capable of exercising the guarantee may create LaunchProof `VERIFIED` evidence.

## Detection

The official Senten adapter detects Senten only from structured declarations:

- root `senten.architecture.json`;
- a parsed root `package.json` dependency named `senten` or under `@senten/*`;
- a supported Senten → LaunchProof evidence envelope.

README text or arbitrary source strings do not count as Senten detection.

## Evidence interchange

The versioned interchange schema is `launchproof-evidence/v1`:

```json
{
  "schema": "launchproof-evidence/v1",
  "producer": { "id": "senten", "version": "1.0.0" },
  "repository": { "name": "example", "branch": "main", "commit": "abc123" },
  "generatedAt": "2026-09-24T00:00:00Z",
  "evidence": [],
  "claims": [],
  "graph": { "nodes": [], "edges": [] }
}
```

Supported conventional paths:

- `.senten/launchproof-evidence.json`
- `senten.launchproof-evidence.json`

Commit identity must match the analyzed snapshot unless the snapshot is explicitly `WORKTREE`. Mismatch fails closed.

## Intended ↔ Observed architecture

Senten-declared graph elements are tagged as **intended** architecture. LaunchProof-discovered graph elements remain **observed** architecture.

LaunchProof v1 exposes deterministic reconciliation states:

- `MATCHED` — an intended component has an observed counterpart;
- `UNOBSERVED` — Senten declares the component but LaunchProof has not observed it;
- `UNDECLARED` — LaunchProof observed a component absent from the intended model;
- `VIOLATION` — observed evidence explicitly violates an intended element;
- `UNKNOWN` — no intended architecture exists for comparison.

These states are evidence-navigation aids, not automatic release passes.

## Extension ABI

Senten is the first official proof of the v1 extension contracts:

- `LanguageAdapter`
- `FrameworkAdapter`
- `PlatformAdapter`
- `EvidenceImporter`
- `ExtensionManifest`
- `AssuranceClaim`

Manifests use `apiVersion: launchproof.dev/v1`, declare capabilities and a compatible LaunchProof Core range. Remote arbitrary plugin loading is not part of the v1 trust boundary.

## Web UI

The LaunchProof web workspace has a dedicated Senten surface showing:

- normalized Senten evidence;
- intended architecture counts;
- Intended ↔ Observed reconciliation;
- architecture violations;
- provenance and certainty.

When no Senten artifacts exist, the UI says so explicitly rather than fabricating state.

## Tauri desktop bridge

LaunchProof Desktop exposes a fixed native-operation allowlist:

- `launchproof.analyze`
- `launchproof.version`
- `senten.inspect`
- `senten.graph`
- `senten.evidence`
- `senten.evidence-test`
- `senten.report`
- `senten.assurance`
- `senten.version`
- `git.status`
- `docker.version`

The webview cannot provide executable names or arbitrary arguments. Repository paths are canonicalized and supplied only as the child process working directory.

On Windows, npm-installed LaunchProof/Senten commands may be `.cmd` shims. The desktop bridge uses `cmd.exe` only for those fixed allowlisted shims; command names and arguments remain host-owned constants. A free-form shell is not exposed.

## Release checkpoint

Before v1.0.0, the Senten checkpoint must prove on a real machine that:

1. Senten is detected from structured artifacts;
2. commit-bound evidence imports successfully;
3. mismatched commit evidence fails closed;
4. upstream VERIFIED is not promoted to LaunchProof VERIFIED;
5. Intended ↔ Observed states render correctly;
6. the desktop allowlist works on Windows;
7. arbitrary executable/argument injection is not possible through the webview.
