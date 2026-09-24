# Distribution

LaunchProof 1.0 is designed to be useful without LaunchProof cloud. The same normalized report model is consumed by the CLI, web interface and desktop client.

## CLI

The public CLI package is `@launchproof/cli`.

Primary commands:

```bash
launchproof analyze .
launchproof verify .
launchproof report .launchproof/report.json
launchproof --version
```

The release workflow builds a self-contained CLI artifact and packages it as a release asset. Publishing to a package registry is a separate release decision; v1 does not require users to trust a cloud service.

## Docker / GHCR

The canonical self-hosted web distribution is:

```text
ghcr.io/rubblmediagroup/launchproof:<version>
```

The stable `v1.0.0` release also publishes `latest`.

Docker Compose remains supported for local/self-hosted use. The web container is not the dynamic-verification runner and does not execute target repositories.

## Desktop

`apps/desktop` is the Tauri 2 local assurance client.

For v1, the Windows build is the required verified desktop surface. It provides:

- local repository validation;
- fixed LaunchProof CLI operations;
- fixed Senten operations;
- Git status diagnostics;
- Docker client diagnostics;
- a narrow native boundary with bounded output and timeout.

The desktop webview does not receive raw filesystem/process/credential powers.

macOS/Linux desktop artifacts may follow after platform-specific release verification. The CLI and Docker surfaces remain cross-platform independently.

## GitHub Release

A stable GitHub Release should contain, at minimum:

- CLI tarball;
- Windows desktop bundle;
- SHA-256 checksum manifest;
- CycloneDX SBOM;
- generated release notes;
- source archives automatically provided by GitHub.

## Release workflow

`.github/workflows/release.yml` performs:

1. Node 24/26 verification;
2. controlled scenarios and self-analysis;
3. Playwright;
4. Docker build;
5. CLI package generation;
6. SBOM/checksum generation;
7. Windows Tauri build;
8. GHCR publication for tags;
9. GitHub Release creation for tags.

A manual workflow dispatch builds candidate artifacts without creating a stable release tag.

## Showcase

The hosted-compatible UI analyzes only server-authorized snapshots and controlled scenarios. It is intentionally not a browser-based arbitrary local filesystem scanner.

## Versioning

The first public stable release is `v1.0.0`. Development candidates use prerelease versions such as `1.0.0-rc.1`. Public claims should identify the exact version and commit analyzed.
