import { describe, expect, it } from 'vitest';
import { rateLimit } from '../../apps/web/lib/rate-limit';
import { publicError } from '../../apps/web/lib/request';

describe('public web security boundary', () => {
  it('does not trust x-forwarded-for unless the host explicitly configures that header', () => {
    const previous = process.env.LAUNCHPROOF_CLIENT_IP_HEADER;
    delete process.env.LAUNCHPROOF_CLIENT_IP_HEADER;
    const scope = `test-${Date.now()}-${Math.random()}`;
    let result = { ok: true, retryAfterSeconds: 0 };
    for (let i = 0; i < 21; i += 1) {
      result = rateLimit(
        new Request('http://localhost', { headers: { 'x-forwarded-for': `203.0.113.${i}` } }),
        scope,
      );
    }
    expect(result.ok).toBe(false);
    if (previous === undefined) delete process.env.LAUNCHPROOF_CLIENT_IP_HEADER;
    else process.env.LAUNCHPROOF_CLIENT_IP_HEADER = previous;
  });

  it('does not expose unexpected internal error messages to public callers', () => {
    expect(
      publicError(
        new Error('/srv/launchproof/private/path: secret detail'),
        'Analysis failed safely.',
      ),
    ).toBe('Analysis failed safely.');
    expect(publicError(new Error('Scenario is not authorized.'), 'Analysis failed safely.')).toBe(
      'Scenario is not authorized.',
    );
  });
});
