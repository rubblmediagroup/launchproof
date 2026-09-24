# Senten integration

Status: **First-class LaunchProof 1.0 integration candidate.** The normalized extension/evidence contract and web visualization are implemented; native desktop execution remains a real-machine release checkpoint.

LaunchProof and Senten remain independently useful products. LaunchProof does not require Senten, and Senten does not require LaunchProof.

## Roles

Senten is treated as an architecture, policy, invariant and evidence producer. LaunchProof independently inspects the repository and may correlate Senten artifacts with LaunchProof evidence, findings, graph relationships, controls and Assurance Cases.

A Senten success result does **not** directly pass a LaunchProof control. Imported `VERIFIED` certainty is downgraded to `INFERRED` because only explicitly authorized LaunchProof isolated verification may create LaunchProof `VERIFIED` evidence.

## Detection

The official Senten platform adapter detects Senten only from structured declarations:

- root `senten.architecture.json`;
- a parsed root `package.json` dependency named `senten` or under `@senten/*`;
- a supported Senten → LaunchProof evidence envelope.

A README mention or arbitrary source-code string is not sufficient.

## Intended architecture

`senten.architecture.json` is parsed as hostile input and is never executed. LaunchProof records the declaration as evidence and, where recognizable structured arrays are present, maps declared modules/components, relationships and invariants into the Application Security Graph.

Senten-declared graph elements are tagged as **intended** architecture. LaunchProof-observed graph elements remain observed architecture. Future architecture-diff work can compare these without conflating them.

## Evidence interchange

The versioned interchange schema is:

```json
{
  "schema": "launchproof-evidence/v1",
  "producer": { "id": "senten", "version": "1.0.0" },
  "repository": { "name": "example", "branch": "main", "commit": "abc123" },
  "generatedAt": "2026-09-17T00:00:00Z",
  "evidence": [],
  "claims": [],
  "graph": { "nodes": [], "edges": [] }
}
```

Supported conventional repository paths are:

- `.senten/launchproof-evidence.json`
- `senten.launchproof-evidence.json`

The importer requires the evidence commit to match the analyzed snapshot unless LaunchProof is explicitly analyzing a working tree identified as `WORKTREE`. Mismatched evidence fails closed.

## Extension ABI

Senten is the first official implementation of the LaunchProof v1 extension contracts:

- `LanguageAdapter`
- `FrameworkAdapter`
- `PlatformAdapter`
- `EvidenceImporter`
- `ExtensionManifest`
- `AssuranceClaim`

Extension manifests use `apiVersion: launchproof.dev/v1`, declare capabilities and declare a LaunchProof Core compatibility range. A plugin marketplace and remote extension loading are intentionally out of scope for LaunchProof 1.0.

## GUI

The LaunchProof web GUI contains a Senten surface. When Senten artifacts exist it shows normalized Senten evidence and intended architecture counts. When none exist, it explicitly says no Senten artifacts were detected rather than fabricating state.

The System Map renders Senten intended nodes alongside LaunchProof-observed nodes because both use the normalized graph contract. The Senten surface also performs deterministic normalized-label correlation and reports MATCHED, UNOBSERVED and UNDECLARED component sets. These states are correspondence signals, not runtime verification or proof that an invariant is satisfied.

## Tauri desktop bridge

LaunchProof Desktop exposes a narrow native command bridge for approved operations only. Current allowlisted operation IDs are:

- `senten.inspect`
- `senten.graph`
- `senten.evidence`
- `senten.evidence-test`
- `senten.report`
- `senten.assurance`
- `senten.version`
- `git.status`
- `docker.version`

The webview cannot supply executable names or arbitrary arguments. The Rust layer maps each operation ID to a fixed program/argument vector, validates the repository directory, uses no shell, applies a 60-second timeout and bounds captured output to 1 MB.

On Windows, npm-installed command shims may be `.cmd` files. LaunchProof intentionally does not fall back to arbitrary `cmd /C` execution. Windows packaging of Senten as a native/sidecar-safe executable or equivalent narrowly controlled launcher is a release-candidate checkpoint.

## 1.0 boundary

LaunchProof 1.0 includes deterministic `MATCHED`, `UNOBSERVED` and `UNDECLARED` architecture correspondence in the UI. `VIOLATION` remains reserved for a stronger rule-aware comparison backed by explicit evidence; LaunchProof does not infer that an unmatched component is automatically a policy violation. Native Senten execution on Windows remains a release-candidate machine checkpoint.
