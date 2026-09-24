import { rateLimit } from '../../../lib/rate-limit';
import { publicError, readSmallJson } from '../../../lib/request';
import { analyzeAuthorizedLocalRepository } from '../../../lib/local-analysis';

const encoder = new TextEncoder();

export async function POST(request: Request) {
  const limit = rateLimit(request, 'local-analyze-stream');
  if (!limit.ok) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded.' }), {
      status: 429,
      headers: {
        'content-type': 'application/json',
        'Retry-After': String(limit.retryAfterSeconds),
      },
    });
  }

  let repositoryPath = '';
  try {
    const body = await readSmallJson<{ repositoryPath?: unknown }>(request);
    repositoryPath = typeof body.repositoryPath === 'string' ? body.repositoryPath : '';
  } catch (error) {
    return new Response(JSON.stringify({ error: publicError(error, 'Invalid request.') }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (value: unknown) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
      try {
        const report = await analyzeAuthorizedLocalRepository(repositoryPath, (event) =>
          send({ type: 'progress', event }),
        );
        send({ type: 'report', report });
      } catch (error) {
        send({ type: 'error', error: publicError(error, 'Local analysis failed safely.') });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
