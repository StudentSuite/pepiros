import "server-only";
import { APICallError, NoObjectGeneratedError, TypeValidationError } from "ai";

/**
 * Resamples a generateObject() call for two failure classes observed live
 * against real biomedical PDFs, neither of which the AI SDK's own repair
 * pass or lib/ai/fallbackModel.ts's provider failover covers:
 *
 * 1. NoObjectGeneratedError -- the model's response fails to parse as JSON
 *    at all. Observed from planPillars(): a response that opened with a
 *    duplicated brace and an early-closed array, breaking every bracket
 *    after it -- not something a text-level repair can fix, but a fresh
 *    sample from the same prompt is very likely to come back well-formed,
 *    since this is sampling variance, not a systematic prompt problem.
 * 2. APICallError caused by a TypeValidationError -- the provider answered
 *    with a 200 whose body isn't a real completion. Observed live from the
 *    Featherless fallback: `{"error":{"message":"Upstream idle timeout
 *    exceeded","code":504}}` wrapped in an HTTP 200, so it fails schema
 *    validation (missing `choices`) instead of surfacing as a retryable
 *    status code -- withFallback() never sees a reason to reroute, and
 *    without this, the whole paper's pipeline died on what is, underneath,
 *    a transient upstream timeout.
 *
 * Anything else (a real rate-limit, an auth failure, a genuine schema
 * violation the model insists on) is a different problem resampling won't
 * fix, so it's rethrown immediately rather than burning retries on it.
 */
function isResamplable(error: unknown): boolean {
  if (NoObjectGeneratedError.isInstance(error)) return true;
  return APICallError.isInstance(error) && TypeValidationError.isInstance(error.cause);
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
