# Desktop Security

LaunchProof Desktop uses a Tauri 2 shell under `apps/desktop`.

The webview is deliberately not granted unrestricted filesystem, shell/process, Docker or credential capabilities. The native boundary exposes repository-path validation, capability reporting and a fixed operation allowlist. Analysis remains a LaunchProof Core responsibility rather than a second Rust implementation.

Provider credentials should use OS-backed secure storage in a future credential-enabled desktop feature and must never enter the webview DOM or serialized analysis report.

## Native operation bridge

Current fixed operation families cover:

- LaunchProof analysis/version diagnostics;
- Senten inspect/graph/evidence/report/assurance/version operations;
- Git status;
- Docker client version.

The webview supplies only an operation ID and repository path. It cannot provide a program name or argument array.

Repository paths are canonicalized natively, filesystem roots are rejected, child stdin is closed, execution has a fixed timeout, and stdout/stderr are bounded to 1 MB each.

## Windows npm command shims

npm-installed LaunchProof and Senten CLIs may resolve to `.cmd` shims on Windows. The bridge handles that case with `cmd.exe` only for the fixed host-owned LaunchProof/Senten operation definitions.

The repository path remains the process working directory and is not interpolated into the command string. No free-form shell or arbitrary command editor is exposed to the webview.

This Windows path is still a release-machine checkpoint: the production Tauri bundle must prove the fixed shim behavior on a real Windows installation before `v1.0.0`.

## Distribution boundary

The preferred long-term packaging path is a bundled/sidecar-safe LaunchProof executable so the desktop app does not depend on a global CLI installation. Until that packaging is proven, the desktop diagnostics surface must accurately report missing local tools rather than silently claiming analysis occurred.
