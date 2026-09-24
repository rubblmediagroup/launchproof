# Contributing

1. Keep analyzers deterministic and side-effect free unless an explicitly authorized isolated runner is used.
2. Every conclusion must link to normalized evidence IDs.
3. Never map absence of evidence to `VERIFIED`.
4. Add focused Vitest coverage for security-sensitive behavior.
5. Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before proposing changes.
6. Mark experimental behavior honestly in docs and PRs.

Extension contracts are documented in `docs/extensions.md`.
