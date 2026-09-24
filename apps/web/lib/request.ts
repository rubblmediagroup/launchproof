export async function readSmallJson<T>(request: Request, maxBytes = 4096): Promise<T> {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes)
    throw new Error(`Request body exceeds ${maxBytes} bytes.`);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes)
    throw new Error(`Request body exceeds ${maxBytes} bytes.`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
}

export function publicError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : '';
  if (
    /Scenario is not authorized|Request body exceeds|Request body must be valid JSON|Invalid authorized repository path/.test(
      message,
    )
  )
    return message;
  return fallback;
}
