/**
 * kernel/errors.ts — Typed error taxonomy
 *
 * WHY THIS EXISTS
 * ---------------
 * All errors in the codebase are currently plain `new Error(message)` with
 * string messages. The dispatcher catches them and returns a generic
 * "Terjadi kesalahan" to the client — no retry decision, no HTTP status
 * mapping, no structured error code for monitoring.
 *
 * This module provides a single AppError class that carries:
 *   - code: machine-readable error code (e.g. 'UPSTREAM_TIMEOUT')
 *   - httpStatus: correct HTTP status code for the response
 *   - retryable: whether the caller should retry
 *   - cause: original error for debugging
 *
 * USAGE
 * -----
 *   throw new AppError('VALIDATION_FAILED', { detail: 'no_wa is required' });
 *   throw new AppError('UPSTREAM_TIMEOUT', { retryable: true });
 *   throw new AppError('FORBIDDEN', { httpStatus: 403 });
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly retryable: boolean;
  public readonly detail?: string;

  constructor(
    code: string,
    opts: {
      message?: string;
      httpStatus?: number;
      retryable?: boolean;
      detail?: string;
      cause?: unknown;
    } = {},
  ) {
    super(opts.message || code);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = opts.httpStatus ?? codeToStatus(code);
    this.retryable = opts.retryable ?? isRetryableCode(code);
    this.detail = opts.detail;
    if (opts.cause) this.cause = opts.cause;
  }

  /** Serialize for API response (never leaks internals). */
  toJSON(): { success: false; error: string; code?: string; retryAfter?: number } {
    return {
      success: false,
      error: this.message,
      code: this.code,
      retryAfter: this.retryable ? Math.ceil(this.httpStatus === 429 ? 30 : 5) : undefined,
    };
  }
}

// ── Error code → HTTP status mapping ─────────────────────────────────────────
export function codeToStatus(code: string): number {
  const map: Record<string, number> = {
    VALIDATION_FAILED: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    RATE_LIMITED: 429,
    UPSTREAM_TIMEOUT: 504,
    UPSTREAM_ERROR: 502,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  };
  return map[code] ?? 500;
}

function isRetryableCode(code: string): boolean {
  return code === 'UPSTREAM_TIMEOUT' || code === 'UPSTREAM_ERROR' || code === 'RATE_LIMITED';
}

// ── Domain-specific error factories ──────────────────────────────────────────
export const Errors = {
  validation: (detail: string) =>
    new AppError('VALIDATION_FAILED', { detail }),

  unauthorized: (msg = 'Sesi tidak valid') =>
    new AppError('UNAUTHORIZED', { message: msg }),

  forbidden: (msg = 'Akses ditolak') =>
    new AppError('FORBIDDEN', { message: msg }),

  notFound: (msg = 'Data tidak ditemukan') =>
    new AppError('NOT_FOUND', { message: msg }),

  rateLimited: (retryAfter: number) =>
    new AppError('RATE_LIMITED', {
      message: `Terlalu banyak permintaan. Coba lagi dalam ${retryAfter} detik.`,
      httpStatus: 429,
      retryable: true,
    }),

  upstreamTimeout: (dep: string) =>
    new AppError('UPSTREAM_TIMEOUT', {
      message: `Timeout: ${dep}`,
      retryable: true,
    }),

  upstreamError: (dep: string, status: number) =>
    new AppError('UPSTREAM_ERROR', {
      message: `Upstream error ${status}: ${dep}`,
      httpStatus: 502,
      retryable: status >= 500,
    }),

  internal: (msg = 'Terjadi kesalahan internal') =>
    new AppError('INTERNAL_ERROR', { message: msg }),
} as const;

/**
 * Convert any error to a safe API response object.
 * Never leaks stack traces or internal details to the client.
 */
export function toErrorResponse(err: unknown): {
  success: false;
  error: string;
  code?: string;
  retryAfter?: number;
} {
  if (err instanceof AppError) return err.toJSON();
  if (err instanceof Error) {
    return {
      success: false,
      error: 'Terjadi kesalahan saat memproses permintaan.',
      code: 'INTERNAL_ERROR',
    };
  }
  return {
    success: false,
    error: 'Terjadi kesalahan saat memproses permintaan.',
    code: 'INTERNAL_ERROR',
  };
}
