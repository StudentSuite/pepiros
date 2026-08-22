import "server-only";
import { APICallError, NoObjectGeneratedError } from "ai";

/**
 * Resamples a generateObject() call for failure classes observed live
 * against real biomedical PDFs, none of which the AI SDK's own repair pass
 * or lib/ai/fallbackModel.ts's provider failover covers:
 *
 * 1. NoObjectGeneratedError -- the model's response fails to parse as JSON
 *    at all. Observed from planPillars(): a response that opened with a
 *    duplicated brace and an early-closed array, breaking every bracket
 *    after it -- not something a text-level repair can fix, but a fresh
 *    sample from the same prompt is very likely to come back well-formed,
 *    since this is sampling variance, not a systematic prompt problem.
 * 2. APICallError with statusCode 200 -- the provider answered with a 200
 *    whose body isn't a usable completion (an error envelope that fails
 *    schema validation, a body that fails to parse at all, etc). Observed
 *    live from the Featherless fallback under two different concrete
 *    shapes (`{"error":{"message":"Upstream idle timeout exceeded",
 *    "code":504}}`, and a bare "Failed to process successful response"),
 *    so this checks the one thing both share -- a 200 status that still
 *    didn't give us a real answer -- rather than pattern-matching either
 *    exact shape.
 * 3. An aborted call (see abortErrorLike below) -- paired with each call
 *    site passing its own `abortSignal: AbortSignal.timeout(...)`. Observed
 *    live: the same Featherless fallback, with no client-side timeout at
 *    all, left one `planPillars()` call hanging for ~12 minutes before
 *    *it* gave up server-side -- three sequential attempts at that pace
 *    is a dead run, not a retry. Bounding each attempt turns "hang for 12
 *    minutes then fail" into "fail in 45 seconds," which is what makes
 *    retrying actually worth it instead of just tripling the wait.
 *
 * Anything else (a real rate-limit, an auth failure, a genuine schema
 * violation the model insists on) is a different problem resampling won't
 * fix, so it's rethrown immediately rather than burning retries on it.
 */
function isAbortErrorLike(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

function isResamplable(error: unknown): boolean {
  if (NoObjectGeneratedError.isInstance(error)) return true;
  if (isAbortErrorLike(error)) return true;
  return APICallError.isInstance(error) && error.statusCode === 200;
}

export async function withObjectRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isResamplable(error) || attempt === attempts) throw error;
    }
  }
  throw lastError;
}
