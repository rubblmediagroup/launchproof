# Security Policy

LaunchProof analyzes hostile input and is itself security-sensitive tooling. Please report suspected vulnerabilities privately to the maintainers rather than opening a public exploit issue. Do not include live credentials, private third-party source code, or production secrets in reports.

## Security invariants

- Static analysis does not execute repository code, lifecycle scripts, binaries or Dockerfiles.
- `VERIFIED` is reserved for explicitly authorized deterministic verification capable of exercising the stated guarantee.
- Invalid policy fails closed rather than silently falling back.
- Hosted Showcase analyzes only explicit server-authorized fixtures.
- Secret evidence is redacted; matched credential values are not retained in normalized reports.
- AI providers cannot independently pass controls, Assurance Cases or release gates.
- External evidence is provenance-bound and cannot promote upstream `VERIFIED` claims directly into LaunchProof `VERIFIED`.
- Dynamic verification requires explicit authorization, a host-owned image allowlist and a digest-pinned runner image.
- The desktop webview cannot supply arbitrary executable names or command arguments.

## Dynamic verification boundary

LaunchProof includes an opt-in isolated Docker runner. It is separate from static repository inspection.

The runner is designed to enforce:

- read-only source mounts;
- read-only container root;
- dropped Linux capabilities;
- `no-new-privileges`;
- CPU, memory, PID, timeout and output limits;
- temporary writable filesystems only where explicitly configured;
- network disabled by default;
- fail-closed behavior for unsupported restricted-egress requests;
- host-owned runner-image allowlists;
- sha256-pinned image requirements.

Container isolation reduces risk but is not an absolute sandbox guarantee. See `docs/sandboxing.md` and `docs/limitations.md`.

## Desktop boundary

The Tauri desktop client uses a narrow command bridge. Operations are selected from a fixed host-owned allowlist. Repository paths are canonicalized and used as working directories; the webview cannot supply executable names or arbitrary arguments.

On Windows, LaunchProof/Senten npm `.cmd` shims may be invoked through `cmd.exe`, but only from fixed operation definitions. The application does not expose a free-form terminal.

## Supported release reporting

Security issues should identify, where possible:

- LaunchProof version;
- affected commit;
- operating system/runtime;
- attack preconditions;
- whether the issue affects static analysis, scanner ingestion, dynamic verification, AI integration, web, desktop or distribution;
- a minimal reproduction that does not contain live secrets.

See `docs/threat-model.md`, `docs/security-model.md`, `docs/sandboxing.md`, `docs/ai-data-governance.md` and `docs/limitations.md`.
