import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import type {
  Analyzer,
  AnalyzerContext,
  AnalyzerOutput,
  Evidence,
  Finding,
  GraphEdge,
  GraphNode,
  RepositorySnapshot,
  SourceLocation,
} from '@launchproof/contracts';
import { createEvidence, stableId } from '@launchproof/evidence';

const VERSION = '1.0.0-rc.1';
const EXCLUDED = new Set([
  '.git',
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '.cache',
  '.output',
]);
const TEXT_EXT = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.yml',
  '.yaml',
  '.md',
  '.env',
  '.txt',
  '.sql',
  '.toml',
]);
const SPECIAL_TEXT_FILES = new Set(['Dockerfile', '.env.example', '.gitignore', 'Procfile']);
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

export interface SnapshotOptions {
  maxFiles?: number;
  maxEntries?: number;
  maxFileBytes?: number;
  maxTotalBytes?: number;
  maxDepth?: number;
  excludePaths?: string[];
}

export async function createRepositorySnapshot(
  root: string,
  meta: { repository?: string; branch?: string; commit?: string } = {},
  options: SnapshotOptions = {},
): Promise<RepositorySnapshot> {
  const maxFiles = options.maxFiles ?? 10_000;
  const maxEntries = options.maxEntries ?? 50_000;
  const maxFileBytes = options.maxFileBytes ?? 1_000_000;
  const maxTotalBytes = options.maxTotalBytes ?? 50_000_000;
  const maxDepth = options.maxDepth ?? 40;
  const excludePaths = (options.excludePaths ?? []).map((item) =>
    item.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, ''),
  );
  const files = new Map<string, string>();
  const absolute = path.resolve(root);
  const canonicalRoot = await realpath(absolute);
  let totalBytes = 0;
  let scannedEntries = 0;
  let skippedSymlinks = 0;
  let skippedOversize = 0;

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth) throw new Error(`Repository exceeds safe directory depth (${maxDepth}).`);
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      scannedEntries += 1;
      if (scannedEntries > maxEntries)
        throw new Error(`Repository exceeds safe directory-entry limit (${maxEntries}).`);
      if (files.size >= maxFiles)
        throw new Error(`Repository exceeds safe file limit (${maxFiles}).`);
      if (EXCLUDED.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      const rel = path.relative(absolute, full).replaceAll('\\', '/');
      if (excludePaths.some((prefix) => rel === prefix || rel.startsWith(`${prefix}/`))) continue;
      if (rel.startsWith('../') || path.isAbsolute(rel))
        throw new Error('Repository traversal escaped the authorized root.');
      const stat = await lstat(full);
      if (stat.isSymbolicLink()) {
        skippedSymlinks += 1;
        continue;
      }
      if (stat.isDirectory()) {
        const canonicalDir = await realpath(full);
        if (
          canonicalDir !== canonicalRoot &&
          !canonicalDir.startsWith(`${canonicalRoot}${path.sep}`)
        ) {
          throw new Error('Repository directory resolves outside the authorized root.');
        }
        await walk(full, depth + 1);
        continue;
      }
      if (!stat.isFile()) continue;
      if (stat.size > maxFileBytes) {
        skippedOversize += 1;
        continue;
      }
      if (totalBytes + stat.size > maxTotalBytes)
        throw new Error(`Repository exceeds safe total text limit (${maxTotalBytes} bytes).`);
      const ext = path.extname(entry.name);
      if (!TEXT_EXT.has(ext) && !SPECIAL_TEXT_FILES.has(entry.name)) continue;
      const content = await readFile(full, 'utf8').catch(() => null);
      if (content !== null && !content.includes('\u0000')) {
        files.set(rel, content);
        totalBytes += Buffer.byteLength(content, 'utf8');
      }
    }
  }

  await walk(absolute, 0);
  return {
    root: absolute,
    repository: meta.repository ?? path.basename(absolute),
    branch: meta.branch ?? 'working-tree',
    commit: meta.commit ?? 'WORKTREE',
    files,
    stats: { fileCount: files.size, totalBytes, scannedEntries, skippedSymlinks, skippedOversize },
  };
}

function scriptKind(file: string): ts.ScriptKind {
  const ext = path.extname(file);
  if (ext === '.tsx') return ts.ScriptKind.TSX;
  if (ext === '.jsx') return ts.ScriptKind.JSX;
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function sourceLocation(sourceFile: ts.SourceFile, node: ts.Node, file: string): SourceLocation {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
  return {
    path: file,
    line: start.line + 1,
    column: start.character + 1,
    endLine: end.line + 1,
    endColumn: end.character + 1,
  };
}

function textLocation(content: string, file: string, index: number): SourceLocation {
  const before = content.slice(0, index);
  const lines = before.split('\n');
  return { path: file, line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
}

function ev<T>(
  ctx: AnalyzerContext,
  kind: string,
  title: string,
  description: string,
  source: SourceLocation | undefined,
  data: T,
  certainty: Evidence['certainty'] = 'DETECTED',
): Evidence<T> {
  return createEvidence({
    kind,
    certainty,
    title,
    description,
    analyzer: { id: 'builtin-ts-next', version: VERSION },
    provenance: ctx.provenance,
    ...(source ? { source } : {}),
    data,
  });
}

function graphNode(
  type: GraphNode['type'],
  label: string,
  evidenceIds: string[],
  sourcePath?: string,
  metadata: Record<string, unknown> = {},
): GraphNode {
  return {
    id: stableId('node', type, label, sourcePath ?? ''),
    type,
    label,
    evidenceIds,
    metadata: { ...(sourcePath ? { sourcePath } : {}), ...metadata },
  };
}

function graphEdge(
  from: GraphNode,
  to: GraphNode,
  type: GraphEdge['type'],
  evidenceIds: string[],
  metadata: Record<string, unknown> = {},
): GraphEdge {
  return {
    id: stableId('edge', from.id, to.id, type),
    from: from.id,
    to: to.id,
    type,
    evidenceIds,
    metadata,
  };
}

const secretPatterns = [
  { name: 'OpenAI API key', regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g, cwe: ['CWE-798'] },
  { name: 'GitHub token', regex: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, cwe: ['CWE-798'] },
  { name: 'AWS access key', regex: /\bAKIA[0-9A-Z]{16}\b/g, cwe: ['CWE-798'] },
  {
    name: 'Private key',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    cwe: ['CWE-321'],
  },
  {
    name: 'Supabase service-role JWT',
    regex: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{20,}\b/g,
    cwe: ['CWE-798'],
  },
];

const AUTH_CALLS = new Set([
  'requireUser',
  'requireAuth',
  'getServerSession',
  'auth',
  'getUser',
  'getSession',
]);
const AUTHZ_CALLS = new Set([
  'requireRole',
  'authorize',
  'canAccess',
  'assertMembership',
  'requireOrganization',
  'requireWorkspace',
  'assertAuthorized',
]);
const VALIDATION_CALLS = new Set(['parse', 'safeParse', 'validate', 'validateSync']);
const RATE_LIMIT_CALLS = new Set(['rateLimit', 'ratelimit', 'checkRateLimit', 'limit']);
const LOG_CALLS = new Set(['info', 'warn', 'error', 'debug', 'log']);

function calleeName(expression: ts.Expression): string | undefined {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return undefined;
}

function collectCalls(sourceFile: ts.SourceFile): ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) calls.push(node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return calls;
}

function literalArgument(call: ts.CallExpression, index = 0): string | undefined {
  const arg = call.arguments[index];
  if (!arg) return undefined;
  if (ts.isStringLiteralLike(arg)) return arg.text;
  return undefined;
}

function routeFromFile(file: string): { route: string; kind: 'route' | 'page' } | null {
  const match = file.match(/(?:^|\/)app\/(.+)\/(route|page)\.(?:ts|tsx|js|jsx)$/);
  if (!match) return null;
  const route = `/${match[1]!}`
    .replace(/\([^/]+\)\//g, '')
    .replace(/\[(?:\.\.\.)?(.+?)\]/g, ':$1')
    .replace(/\/page$/, '');
  return {
    route: route === '/' ? '/' : route.replace(/\/$/, ''),
    kind: match[2] as 'route' | 'page',
  };
}

function isPublicEnv(name: string): boolean {
  return name.startsWith('NEXT_PUBLIC_') || name.startsWith('VITE_') || name.startsWith('PUBLIC_');
}

function addFinding(
  findings: Finding[],
  input: Omit<Finding, 'id' | 'status' | 'analyzer'> & { discriminator: string },
) {
  findings.push({
    ...input,
    id: stableId('finding', input.ruleId, input.discriminator),
    status: 'open',
    analyzer: { id: 'builtin-ts-next', version: VERSION },
  });
}

export class TypeScriptNextAnalyzer implements Analyzer {
  id = 'builtin-ts-next';
  version = VERSION;

  analyze(ctx: AnalyzerContext): AnalyzerOutput {
    const evidence: Evidence[] = [];
    const findings: Finding[] = [];
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const sourceNodes = new Map<string, GraphNode[]>();
    const registerNode = (item: GraphNode) => {
      nodes.push(item);
      const sourcePath =
        typeof item.metadata.sourcePath === 'string' ? item.metadata.sourcePath : undefined;
      if (sourcePath) sourceNodes.set(sourcePath, [...(sourceNodes.get(sourcePath) ?? []), item]);
      return item;
    };

    const pkg = ctx.snapshot.files.get('package.json');
    if (pkg) {
      let parsed: Record<string, any> = {};
      try {
        parsed = JSON.parse(pkg) as Record<string, any>;
      } catch {
        const malformed = ev(
          ctx,
          'repository.package-manifest-invalid',
          'Invalid package manifest',
          'package.json could not be parsed as JSON.',
          { path: 'package.json' },
          {},
        );
        evidence.push(malformed);
        addFinding(findings, {
          discriminator: 'package.json',
          ruleId: 'LP-20',
          title: 'Malformed package manifest',
          domain: 'quality',
          severity: 'medium',
          confidence: 1,
          source: { path: 'package.json' },
          evidenceIds: [malformed.id],
          affectedComponents: ['package.json'],
          graphPaths: [],
          explanation: 'The package manifest could not be parsed deterministically.',
          impact:
            'Dependency and script analysis is incomplete and downstream assumptions may be unsafe.',
          remediation: 'Repair package.json and rerun LaunchProof.',
        });
      }
      const deps = { ...(parsed.dependencies ?? {}), ...(parsed.devDependencies ?? {}) };
      if (deps.next)
        evidence.push(
          ev(
            ctx,
            'framework.nextjs',
            'Next.js detected',
            'package.json declares Next.js.',
            { path: 'package.json' },
            { version: deps.next },
          ),
        );
      if (deps.react)
        evidence.push(
          ev(
            ctx,
            'framework.react',
            'React detected',
            'package.json declares React.',
            { path: 'package.json' },
            { version: deps.react },
          ),
        );
      if (deps['@supabase/supabase-js'] || deps['@supabase/ssr'])
        evidence.push(
          ev(
            ctx,
            'framework.supabase',
            'Supabase dependency detected',
            'A Supabase client package is declared.',
            { path: 'package.json' },
            { packages: Object.keys(deps).filter((name) => name.startsWith('@supabase/')) },
          ),
        );
      if (deps.zod)
        evidence.push(
          ev(
            ctx,
            'framework.validation-library',
            'Validation library detected',
            'Zod is declared as a dependency.',
            { path: 'package.json' },
            { package: 'zod', version: deps.zod },
          ),
        );
      evidence.push(
        ev(
          ctx,
          'repository.package-manifest',
          'Package manifest discovered',
          'Static package metadata was inspected; lifecycle scripts were not executed.',
          { path: 'package.json' },
          {
            scripts: parsed.scripts ?? {},
            dependencyCount: Object.keys(deps).length,
            packageManager: parsed.packageManager,
          },
        ),
      );
      for (const [name, command] of Object.entries(parsed.scripts ?? {})) {
        if (typeof command === 'string' && /\b(?:preinstall|postinstall|prepare)\b/i.test(name)) {
          evidence.push(
            ev(
              ctx,
              'repository.lifecycle-script',
              'Package lifecycle script declared',
              `Lifecycle script ${name} was observed but not executed.`,
              { path: 'package.json' },
              { name, command },
            ),
          );
        }
      }
    }

    const lockfiles = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb'].filter(
      (name) => ctx.snapshot.files.has(name),
    );
    if (lockfiles.length)
      evidence.push(
        ev(
          ctx,
          'dependency.lockfile',
          'Dependency lockfile detected',
          'A dependency lockfile is present for reproducible dependency resolution.',
          { path: lockfiles[0]! },
          { lockfiles },
        ),
      );

    for (const [file, content] of ctx.snapshot.files) {
      const ext = path.extname(file);
      const route = routeFromFile(file);
      let routeNode: GraphNode | undefined;
      if (route) {
        const routeEvidence = ev(
          ctx,
          'architecture.route',
          'Route discovered',
          `Next.js ${route.kind} ${route.route} discovered from file structure.`,
          { path: file },
          route,
        );
        evidence.push(routeEvidence);
        routeNode = registerNode(
          graphNode('Route', route.route, [routeEvidence.id], file, { routeKind: route.kind }),
        );
      }

      if (/(^|\/)middleware\.(ts|js)$/.test(file)) {
        const item = ev(
          ctx,
          'architecture.middleware',
          'Middleware discovered',
          'Next.js middleware file discovered.',
          { path: file },
          {},
        );
        evidence.push(item);
        registerNode(graphNode('Middleware', file, [item.id], file));
      }

      if (file === 'next.config.js' || file === 'next.config.mjs' || file === 'next.config.ts') {
        const headers =
          /headers\s*\(/.test(content) ||
          /Content-Security-Policy|Strict-Transport-Security|X-Content-Type-Options/.test(content);
        evidence.push(
          ev(
            ctx,
            headers ? 'production.security-headers' : 'production.next-config',
            headers
              ? 'Security header configuration detected'
              : 'Next.js production configuration detected',
            headers
              ? 'Security header configuration is present in Next.js configuration.'
              : 'Next.js configuration file was statically inspected.',
            { path: file },
            { securityHeadersIndicator: headers },
          ),
        );
      }

      if (/^\.github\/workflows\/.*\.ya?ml$/.test(file)) {
        const ci = ev(
          ctx,
          'production.ci-workflow',
          'CI workflow detected',
          'A GitHub Actions workflow is present.',
          { path: file },
          {
            hasBuild: /\b(?:npm|pnpm|yarn)\s+(?:run\s+)?build\b/.test(content),
            hasTest: /\b(?:npm|pnpm|yarn)\s+(?:run\s+)?test\b/.test(content),
            hasLint: /\b(?:npm|pnpm|yarn)\s+(?:run\s+)?lint\b/.test(content),
            hasTypecheck: /typecheck|tsc\b/.test(content),
          },
        );
        evidence.push(ci);
        registerNode(graphNode('Deployment', file, [ci.id], file));
      }

      if (/^(?:Dockerfile|docker-compose\.ya?ml)$/.test(file)) {
        evidence.push(
          ev(
            ctx,
            'production.container-config',
            'Container configuration detected',
            'Container/deployment configuration was observed but not executed.',
            { path: file },
            { type: file },
          ),
        );
      }

      if (/\.env(?:\.|$)/.test(path.basename(file))) {
        for (const match of content.matchAll(/^([A-Z][A-Z0-9_]*)\s*=/gm)) {
          const name = match[1]!;
          const item = ev(
            ctx,
            'configuration.environment-declaration',
            'Environment variable declaration detected',
            `${name} is declared in an environment file. Values are not copied into evidence.`,
            textLocation(content, file, match.index ?? 0),
            { name, public: isPublicEnv(name), valueRedacted: true },
          );
          evidence.push(item);
          registerNode(
            graphNode('EnvironmentVariable', name, [item.id], file, { public: isPublicEnv(name) }),
          );
        }
      }

      if (file.includes('supabase/migrations/') && ext === '.sql') {
        const enableRlsMatches = [
          ...content.matchAll(
            /alter\s+table\s+(?:public\.)?["']?([a-zA-Z0-9_]+)["']?\s+enable\s+row\s+level\s+security/gi,
          ),
        ];
        const policyMatches = [
          ...content.matchAll(
            /create\s+policy\s+["']?([^"'\n]+)["']?\s+on\s+(?:public\.)?["']?([a-zA-Z0-9_]+)["']?/gi,
          ),
        ];
        for (const match of enableRlsMatches) {
          const item = ev(
            ctx,
            'security.rls-enabled',
            'Row Level Security enabled',
            `RLS is enabled for table ${match[1]}.`,
            textLocation(content, file, match.index ?? 0),
            { table: match[1] },
          );
          evidence.push(item);
          registerNode(
            graphNode('RLSPolicy', `RLS enabled: ${match[1]}`, [item.id], file, {
              table: match[1],
              kind: 'enable',
            }),
          );
        }
        for (const match of policyMatches) {
          const item = ev(
            ctx,
            'security.rls-policy',
            'RLS policy definition detected',
            `RLS policy ${match[1]!.trim()} is defined on ${match[2]}.`,
            textLocation(content, file, match.index ?? 0),
            { policy: match[1]!.trim(), table: match[2] },
          );
          evidence.push(item);
          registerNode(
            graphNode('RLSPolicy', `${match[2]}:${match[1]!.trim()}`, [item.id], file, {
              table: match[2],
              kind: 'policy',
            }),
          );
        }
      }

      for (const pattern of secretPatterns) {
        pattern.regex.lastIndex = 0;
        for (const match of content.matchAll(pattern.regex)) {
          const item = ev(
            ctx,
            'security.secret',
            'Potential committed secret detected',
            `${pattern.name} pattern was detected. Value is redacted.`,
            textLocation(content, file, match.index ?? 0),
            { secretType: pattern.name, redacted: true },
          );
          evidence.push(item);
          registerNode(graphNode('Secret', `${pattern.name} (${file})`, [item.id], file));
          addFinding(findings, {
            discriminator: `${file}:${match.index ?? 0}:${pattern.name}`,
            ruleId: 'LP-06',
            title: 'Potential committed secret',
            domain: 'security',
            severity: 'critical',
            confidence: 0.99,
            source: textLocation(content, file, match.index ?? 0),
            evidenceIds: [item.id],
            cwe: pattern.cwe,
            owasp: ['A07:2021'],
            affectedComponents: [file],
            graphPaths: [],
            explanation: `A ${pattern.name} signature is present in repository content. The secret value is redacted from evidence.`,
            impact: 'A committed credential may permit unauthorized access if valid.',
            remediation:
              'Revoke and rotate the credential, remove it from repository history, and use an appropriate secret manager.',
          });
        }
      }

      if (!CODE_EXT.has(ext)) continue;
      const sourceFile = ts.createSourceFile(
        file,
        content,
        ts.ScriptTarget.Latest,
        true,
        scriptKind(file),
      );
      const parseDiagnostics =
        (sourceFile as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] })
          .parseDiagnostics ?? [];
      if (parseDiagnostics.length) {
        const item = ev(
          ctx,
          'code.parse-diagnostic',
          'Source parse diagnostic detected',
          'TypeScript parser reported syntax diagnostics during static inspection.',
          { path: file },
          { count: parseDiagnostics.length },
        );
        evidence.push(item);
      }

      const serverDirective = sourceFile.statements.find(
        (statement) =>
          ts.isExpressionStatement(statement) &&
          ts.isStringLiteral(statement.expression) &&
          statement.expression.text === 'use server',
      );
      if (serverDirective) {
        const item = ev(
          ctx,
          'architecture.server-action',
          'Server action boundary discovered',
          'A use server directive was directly observed by the syntax parser.',
          sourceLocation(sourceFile, serverDirective, file),
          {},
        );
        evidence.push(item);
        registerNode(graphNode('ServerAction', file, [item.id], file));
      }

      const publicRouteDeclared =
        sourceFile.getFullText().includes('launchproof:public') ||
        sourceFile.statements.some(
          (statement) =>
            ts.isVariableStatement(statement) &&
            statement.modifiers?.some(
              (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
            ) &&
            statement.declarationList.declarations.some(
              (declaration) =>
                ts.isIdentifier(declaration.name) &&
                declaration.name.text === 'launchProofPublic' &&
                declaration.initializer?.kind === ts.SyntaxKind.TrueKeyword,
            ),
        );
      if (routeNode && publicRouteDeclared)
        evidence.push(
          ev(
            ctx,
            'security.public-route-declaration',
            'Public route intent declared',
            'The route explicitly declares that it is public for LaunchProof policy analysis.',
            { path: file },
            { route: routeNode.label },
          ),
        );

      const calls = collectCalls(sourceFile);
      const authNodes: GraphNode[] = [];
      const authzNodes: GraphNode[] = [];
      const validationNodes: GraphNode[] = [];
      const rateNodes: GraphNode[] = [];
      const tableNodes: GraphNode[] = [];
      const databaseNodes: GraphNode[] = [];
      const externalNodes: GraphNode[] = [];
      const aiNodes: GraphNode[] = [];

      for (const call of calls) {
        const name = calleeName(call.expression);
        if (!name) continue;
        const loc = sourceLocation(sourceFile, call, file);
        if (AUTH_CALLS.has(name)) {
          const item = ev(
            ctx,
            'security.authentication-indicator',
            'Authentication boundary detected',
            `${name}() is called in executable syntax.`,
            loc,
            { callee: name },
          );
          evidence.push(item);
          authNodes.push(
            registerNode(
              graphNode('AuthenticationBoundary', `${file}:${name}:${loc.line}`, [item.id], file),
            ),
          );
        }
        if (AUTHZ_CALLS.has(name)) {
          const item = ev(
            ctx,
            'security.authorization-indicator',
            'Authorization boundary detected',
            `${name}() is called in executable syntax.`,
            loc,
            { callee: name },
          );
          evidence.push(item);
          authzNodes.push(
            registerNode(
              graphNode('AuthorizationPolicy', `${file}:${name}:${loc.line}`, [item.id], file),
            ),
          );
        }
        if (VALIDATION_CALLS.has(name)) {
          const item = ev(
            ctx,
            'security.input-validation',
            'Input validation operation detected',
            `${name}() validation operation is called.`,
            loc,
            { operation: name },
          );
          evidence.push(item);
          validationNodes.push(
            registerNode(
              graphNode('ValidationBoundary', `${file}:${name}:${loc.line}`, [item.id], file),
            ),
          );
        }
        if (RATE_LIMIT_CALLS.has(name)) {
          const item = ev(
            ctx,
            'security.rate-limit',
            'Rate-limit operation detected',
            `${name}() rate-limit indicator is called.`,
            loc,
            { operation: name },
          );
          evidence.push(item);
          rateNodes.push(
            registerNode(graphNode('RateLimit', `${file}:${name}:${loc.line}`, [item.id], file)),
          );
        }
        if (LOG_CALLS.has(name) && ts.isPropertyAccessExpression(call.expression)) {
          const owner = call.expression.expression.getText(sourceFile);
          if (/logger|console|log/i.test(owner))
            evidence.push(
              ev(
                ctx,
                'production.logging',
                'Logging operation detected',
                'A logging call was observed.',
                loc,
                { owner, operation: name },
              ),
            );
        }
        if (name === 'from' && ts.isPropertyAccessExpression(call.expression)) {
          const table = literalArgument(call);
          if (table) {
            const item = ev(
              ctx,
              'data.table-reference',
              'Database table reference detected',
              `Table ${table} is referenced by a data-access call.`,
              loc,
              { table },
            );
            evidence.push(item);
            tableNodes.push(registerNode(graphNode('Table', table, [item.id], file)));
          }
        }
        if (
          ['createClient', 'createServerClient'].includes(name) ||
          call.expression.getText(sourceFile).includes('supabase.')
        ) {
          const item = ev(
            ctx,
            'data.supabase',
            'Supabase usage detected',
            'Supabase client usage was observed in executable syntax.',
            loc,
            { callee: name },
          );
          evidence.push(item);
          databaseNodes.push(registerNode(graphNode('Database', 'Supabase', [item.id], file)));
        }
        if (name === 'fetch') {
          const url = literalArgument(call);
          const item = ev(
            ctx,
            'architecture.external-api',
            'External HTTP dependency detected',
            url ? `fetch() targets ${url}.` : 'A dynamic fetch() call was observed.',
            loc,
            { url: url ?? null, dynamic: !url },
          );
          evidence.push(item);
          externalNodes.push(
            registerNode(
              graphNode('ExternalAPI', url ?? `${file}:dynamic-fetch:${loc.line}`, [item.id], file),
            ),
          );
        }
        if (
          ['openai', 'anthropic', 'gemini', 'generateText', 'chat', 'responses'].includes(
            name.toLowerCase(),
          )
        ) {
          const item = ev(
            ctx,
            'ai.provider-usage',
            'AI provider usage indicator detected',
            'A call associated with an AI provider or generation API was observed.',
            loc,
            { callee: name },
          );
          evidence.push(item);
          aiNodes.push(registerNode(graphNode('AIProvider', `${file}:${name}`, [item.id], file)));
        }
      }

      const identifiers = new Set<string>();
      const visit = (node: ts.Node) => {
        if (
          ts.isIdentifier(node) &&
          /^(?:organizationId|tenantId|workspaceId|orgId|organization_id|tenant_id|workspace_id)$/i.test(
            node.text,
          )
        )
          identifiers.add(node.text);
        if (
          ts.isPropertyAccessExpression(node) &&
          node.expression.getText(sourceFile) === 'process.env'
        ) {
          const name = node.name.text;
          const item = ev(
            ctx,
            'configuration.environment-read',
            'Environment variable usage detected',
            `${name} is read by application code.`,
            sourceLocation(sourceFile, node, file),
            { name, public: isPublicEnv(name) },
          );
          evidence.push(item);
          const envNode = registerNode(
            graphNode('EnvironmentVariable', name, [item.id], file, { public: isPublicEnv(name) }),
          );
          if (routeNode)
            edges.push(
              graphEdge(routeNode, envNode, 'DEPENDS_ON', [...routeNode.evidenceIds, item.id]),
            );
          if (isPublicEnv(name) && /SECRET|SERVICE_ROLE|PRIVATE|TOKEN|PASSWORD|KEY/i.test(name)) {
            addFinding(findings, {
              discriminator: `${file}:${name}`,
              ruleId: 'LP-06',
              title: 'Sensitive-looking environment variable exposed to client bundle',
              domain: 'security',
              severity: 'high',
              confidence: 0.9,
              source: sourceLocation(sourceFile, node, file),
              evidenceIds: [item.id],
              cwe: ['CWE-200'],
              owasp: ['A02:2021'],
              affectedComponents: [file, name],
              graphPaths: [],
              explanation: `${name} uses a public environment prefix while its name indicates sensitive material.`,
              impact:
                'The value may be included in browser-delivered code depending on framework bundling.',
              remediation:
                'Move sensitive configuration to a server-only environment variable and rotate exposed credentials.',
            });
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
      if (identifiers.size)
        evidence.push(
          ev(
            ctx,
            'security.tenant-scope',
            'Tenant scope indicator detected',
            'Tenant/workspace scoped identifiers were observed in parsed syntax.',
            { path: file },
            { identifiers: [...identifiers].sort() },
          ),
        );

      if (/(?:\.test|\.spec)\.(?:ts|tsx|js|jsx)$/.test(file)) {
        const testEvidence = ev(
          ctx,
          'testing.test-file',
          'Test file discovered',
          'A test/spec file was discovered without executing it.',
          { path: file },
          {
            frameworkIndicators: [...content.matchAll(/\b(describe|it|test|expect)\s*\(/g)].map(
              (match) => match[1],
            ),
          },
        );
        evidence.push(testEvidence);
        registerNode(graphNode('Test', file, [testEvidence.id], file));
        if (/tenant|organization|workspace|cross[- ]tenant/i.test(content))
          evidence.push(
            ev(
              ctx,
              'testing.security-test',
              'Security-focused test indicator detected',
              'The test source references tenant or organization isolation concepts.',
              { path: file },
              { topic: 'tenant-isolation' },
            ),
          );
      }

      if (
        /\bthrow\s+new\s+Error\s*\(/.test(content) ||
        /NextResponse\.json\([^)]*error/i.test(content)
      ) {
        evidence.push(
          ev(
            ctx,
            'quality.error-handling',
            'Error-handling code detected',
            'Explicit error handling was observed in application code.',
            { path: file },
            {},
          ),
        );
      }
      if (/health|healthz|readyz|readiness/i.test(file) || /health\s*[:=]/i.test(content))
        evidence.push(
          ev(
            ctx,
            'production.health-check',
            'Health-check indicator detected',
            'A health/readiness indicator was observed.',
            { path: file },
            {},
          ),
        );
      if (/sentry|opentelemetry|otel|traceId|requestId|correlationId/i.test(content))
        evidence.push(
          ev(
            ctx,
            'production.observability',
            'Observability indicator detected',
            'Tracing, error monitoring, or request-correlation indicator was observed.',
            { path: file },
            {},
          ),
        );
      if (/aria-|role=|<label|alt=/.test(content) && ext.includes('x'))
        evidence.push(
          ev(
            ctx,
            'accessibility.semantic-markup',
            'Accessibility markup detected',
            'Accessible markup attributes or labels were observed in JSX/TSX.',
            { path: file },
            {},
          ),
        );

      if (routeNode) {
        for (const item of authNodes)
          edges.push(
            graphEdge(routeNode, item, 'AUTHENTICATES_THROUGH', [
              ...routeNode.evidenceIds,
              ...item.evidenceIds,
            ]),
          );
        for (const item of authzNodes)
          edges.push(
            graphEdge(routeNode, item, 'AUTHORIZED_BY', [
              ...routeNode.evidenceIds,
              ...item.evidenceIds,
            ]),
          );
        for (const item of validationNodes)
          edges.push(
            graphEdge(routeNode, item, 'VALIDATED_BY', [
              ...routeNode.evidenceIds,
              ...item.evidenceIds,
            ]),
          );
        for (const item of rateNodes)
          edges.push(
            graphEdge(routeNode, item, 'RATE_LIMITED_BY', [
              ...routeNode.evidenceIds,
              ...item.evidenceIds,
            ]),
          );
        for (const item of databaseNodes)
          edges.push(
            graphEdge(routeNode, item, 'DEPENDS_ON', [
              ...routeNode.evidenceIds,
              ...item.evidenceIds,
            ]),
          );
        for (const item of tableNodes)
          edges.push(
            graphEdge(routeNode, item, 'READS', [...routeNode.evidenceIds, ...item.evidenceIds]),
          );
        for (const item of externalNodes)
          edges.push(
            graphEdge(routeNode, item, 'CALLS', [...routeNode.evidenceIds, ...item.evidenceIds]),
          );
        for (const item of aiNodes)
          edges.push(
            graphEdge(routeNode, item, 'CALLS', [...routeNode.evidenceIds, ...item.evidenceIds]),
          );

        const mutation =
          /export\s+(?:async\s+)?function\s+(?:POST|PUT|PATCH|DELETE)\b|export\s+const\s+(?:POST|PUT|PATCH|DELETE)\b/.test(
            content,
          );
        if (mutation && authzNodes.length === 0 && !publicRouteDeclared) {
          const related = routeNode.evidenceIds;
          addFinding(findings, {
            discriminator: `${file}:mutation-without-authz`,
            ruleId: 'LP-03',
            title: 'Mutation route lacks detected authorization boundary',
            domain: 'security',
            severity: 'high',
            confidence: 0.82,
            source: { path: file },
            evidenceIds: related,
            cwe: ['CWE-862'],
            owasp: ['A01:2021'],
            affectedComponents: [routeNode.id],
            graphPaths: [[routeNode.id]],
            explanation:
              'A mutation-capable route was detected, but no supported authorization call was found in the same execution unit.',
            impact:
              'Sensitive state changes may be reachable without an authorization check, depending on upstream protections.',
            remediation:
              'Add an explicit authorization boundary or provide deterministic evidence of equivalent upstream enforcement.',
          });
        }
        if (mutation && rateNodes.length === 0) {
          addFinding(findings, {
            discriminator: `${file}:mutation-without-rate-limit`,
            ruleId: 'LP-11',
            title: 'Mutation route lacks detected abuse control',
            domain: 'security',
            severity: 'medium',
            confidence: 0.72,
            source: { path: file },
            evidenceIds: routeNode.evidenceIds,
            cwe: ['CWE-770'],
            affectedComponents: [routeNode.id],
            graphPaths: [[routeNode.id]],
            explanation:
              'A mutation-capable route was detected without a supported rate-limit indicator in the same route source.',
            impact:
              'The operation may be more susceptible to automated abuse or resource exhaustion.',
            remediation:
              'Apply an abuse-control strategy appropriate to the route and verify it with tests or runtime evidence.',
          });
        }
      }
    }

    evidence.push(
      ev(
        ctx,
        'security.secret-scan-complete',
        'Built-in secret signature scan completed',
        'LaunchProof inspected every bounded text file in the repository snapshot with the built-in credential signature set.',
        undefined,
        {
          filesInspected: ctx.snapshot.files.size,
          signatureCount: secretPatterns.length,
          findings: findings.filter((item) => item.ruleId === 'LP-06' && item.status === 'open')
            .length,
        },
      ),
    );

    const bySource = (source: string, type: GraphNode['type']) =>
      (sourceNodes.get(source) ?? []).filter((item) => item.type === type);
    for (const item of nodes.filter((entry) => entry.type === 'Database')) {
      const source = String(item.metadata.sourcePath ?? '');
      for (const table of bySource(source, 'Table'))
        edges.push(graphEdge(item, table, 'READS', [...item.evidenceIds, ...table.evidenceIds]));
    }
    for (const policyNode of nodes.filter((entry) => entry.type === 'RLSPolicy')) {
      const tableName =
        typeof policyNode.metadata.table === 'string' ? policyNode.metadata.table : undefined;
      if (!tableName) continue;
      for (const table of nodes.filter(
        (entry) => entry.type === 'Table' && entry.label === tableName,
      ))
        edges.push(
          graphEdge(table, policyNode, 'AUTHORIZED_BY', [
            ...table.evidenceIds,
            ...policyNode.evidenceIds,
          ]),
        );
    }

    const publicSensitiveEnv = evidence.filter(
      (item) =>
        item.kind === 'configuration.environment-read' &&
        typeof item.data === 'object' &&
        item.data !== null &&
        (item.data as any).public &&
        /SECRET|SERVICE_ROLE|PRIVATE|TOKEN|PASSWORD|KEY/i.test(String((item.data as any).name)),
    );
    for (const item of publicSensitiveEnv) {
      const envNode = nodes.find(
        (node) => node.type === 'EnvironmentVariable' && node.evidenceIds.includes(item.id),
      );
      if (!envNode) continue;
      for (const routeNodeItem of nodes.filter(
        (node) => node.type === 'Route' && node.metadata.sourcePath === envNode.metadata.sourcePath,
      ))
        edges.push(
          graphEdge(routeNodeItem, envNode, 'EXPOSES', [...routeNodeItem.evidenceIds, item.id]),
        );
    }

    return { evidence, findings, graphNodes: nodes, graphEdges: edges };
  }
}
