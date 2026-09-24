# Analyzers

`TypeScriptNextAnalyzer` is the built-in deep v0.2 analyzer. It uses the TypeScript parser for executable JavaScript/TypeScript syntax and supplements AST inspection with deterministic file/config/SQL/workflow parsing.

It currently discovers Next.js routes, middleware, server actions, auth/authz calls, tenant identifiers, validation calls, rate-limit calls, environment reads/declarations, Supabase clients/tables/RLS, external fetches, AI-provider indicators, tests, CI/container configuration, logging/observability/health indicators and selected error/accessibility signals.

It never receives a shell and never executes target code.

Community analyzers implement `Analyzer { id, version, analyze(context) }`. Scanner integrations should implement `ScannerAdapter` and normalize mature scanner output rather than recreate scanners.
