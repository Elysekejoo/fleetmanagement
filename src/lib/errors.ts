/**
 * Converts unknown thrown values (Supabase/PostgREST/network) into
 * meaningful, human-readable error messages. RPCs raise descriptive
 * exceptions which PostgREST surfaces in `error.message`; those are
 * passed through verbatim. Technical failures are mapped to clear
 * explanations instead of a generic "Operation failed".
 */

function normalize(err: unknown): { code?: string; message: string } {
  const isError = err instanceof Error;
  let code = isError ? (err as { code?: string }).code : undefined;
  let message = isError ? (err as Error).message : undefined;

  if (!isError && typeof err === 'object' && err !== null) {
    // supabase-js PostgrestError and similar SDK errors are plain
    // objects { code, details, hint, message } rather than Error
    // instances; extract their fields so RPC messages surface.
    const o = err as { code?: unknown; message?: unknown };
    if (typeof o.code === 'string') code = o.code;
    if (typeof o.message === 'string') message = o.message;
  }

  if (typeof message !== 'string') {
    return { message: err == null ? 'Unknown error' : String(err) };
  }

  // PostgREST can wrap the real payload as a JSON string.
  if (message.startsWith('{') || message.startsWith('[')) {
    try {
      const parsed = JSON.parse(message);
      if (typeof parsed === 'string') return { code, message: parsed };
      const innerCode = parsed.code ?? parsed.error?.code;
      const innerMessage = (parsed as { message?: string }).message ?? (parsed as { error?: { message?: string } }).error?.message;
      if (innerMessage) {
        message = typeof innerMessage === 'string' ? innerMessage : String(innerMessage);
        code = typeof innerCode === 'string' ? innerCode : code;
      }
    } catch {
      // not JSON; keep the raw message
    }
  }
  return { code, message };
}

const CODE_MESSAGES: Record<string, string> = {
  '42501': 'You do not have permission to perform this action.',
  '23505': 'This record already exists. Please check for duplicates and try again.',
  '23503': 'This record is linked to other data and cannot be changed or deleted.',
  '23502': 'A required value is missing. Please fill in all required fields.',
  '22P02': 'One of the values you entered is invalid. Please review the form.',
  '23514': 'One of the values you entered does not satisfy the required rules.',
  '57014': 'The request took too long and was stopped. Please try again.',
};

const PATTERN_MESSAGES: Array<{ test: RegExp; message: string }> = [
  {
    test: /row.?level security|violates row|permission denied|PGRST301|not authorized to connect|42501/i,
    message: 'You do not have permission to perform this action.',
  },
  {
    test: /duplicate key|already exists|23505/i,
    message: 'This record already exists. Please check for duplicates and try again.',
  },
  {
    test: /foreign key|referenced|23503/i,
    message: 'This record is linked to other data and cannot be changed or deleted.',
  },
  {
    // PostgREST doesn't know a function/table yet (PGRST202: "... in the
    // schema cache ..."). Usually the migration exists but the schema
    // cache hasn't been reloaded; tell the admin to reload it.
    test: /schema cache|could not find the (function|table)/i,
    message:
      'The system is waiting for a pending database update to take effect. Please have the administrator apply any pending migrations and reload the database schema (Supabase Dashboard → Database → Reload schema), then try again.',
  },
  {
    // .single() with zero rows after records were removed (PGRST116).
    test: /multiple \(or no\) rows returned|PGRST116|no rows/i,
    message: 'The record you requested could not be found.',
  },
  {
    // Remaining PostgREST configuration errors (PGRST204/205 etc.).
    test: /PGRST2/i,
    message: 'A server configuration issue occurred. Please contact the administrator.',
  },
  {
    test: /failed to fetch|networkerror|network error|fetch failed|load failed|ECONNREFUSED|ERR_CONNECTION/i,
    message: 'Unable to reach the server. Check your internet connection and try again.',
  },
  {
    test: /timeout|timed out|ETIMEDOUT/i,
    message: 'The request timed out. Please try again.',
  },
];

export function friendlyError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const { code, message } = normalize(err);
  const trimmed = message.trim();

  if (code && CODE_MESSAGES[code.toUpperCase()]) return CODE_MESSAGES[code.toUpperCase()];

  for (const rule of PATTERN_MESSAGES) {
    if (rule.test.test(trimmed) || (code && rule.test.test(code))) return rule.message;
  }

  if (!trimmed || trimmed === 'Unknown error') return fallback;

  // Keep short, genuine server-provided sentences (e.g. exceptions
  // raised by our RPCs); discard opaque PostgREST identifiers.
  const looksHuman =
    trimmed.length >= 6 &&
    trimmed.length <= 220 &&
    /\s/.test(trimmed) &&
    /^[A-Za-z 0-9.,:'!?()/-]+$/.test(trimmed) &&
    !/["'{}\\`]/.test(trimmed);
  if (looksHuman) return trimmed;

  return fallback;
}

/** Thin wrapper for mutation handlers: throw -> friendly message. */
export function asErrorMessage(err: unknown, fallback?: string): string {
  return friendlyError(err, fallback);
}
