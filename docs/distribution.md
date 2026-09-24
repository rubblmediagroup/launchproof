# Distribution

LaunchProof Core is shared across official surfaces.

## CLI

`launchproof analyze`, `verify` and `report` support JSON and SARIF output, scanner-result ingestion and CI-friendly exit codes.

## Docker

Docker Compose is the canonical self-hosted web distribution. The container is read-only, capability-dropped and non-root. Target code execution is not performed in the web container.

## Desktop

`apps/desktop` is an experimental Tauri 2 shell with a narrow native boundary. It is architected to delegate analysis to LaunchProof Core rather than reimplement it in Rust.

## Showcase

The hosted-compatible UI analyzes only authorized targets and controlled scenarios.

There is one normalized LaunchProof report model across surfaces, and no surface requires LaunchProof cloud or an LLM.
