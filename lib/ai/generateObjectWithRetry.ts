import "server-only";
import { NoObjectGeneratedError } from "ai";

/**
 * Resamples a generateObject() call when the model's response fails to
 * parse as JSON at all -- a different failure class from a schema mismatch
 * (which the AI SDK's own repair pass already retries within one call).
 * Observed live against a real biomedical case-report PDF: `planPillars()`
 * got back a response that opened with a duplicated brace and an
 * early-closed array, breaking every bracket after it -- not something a
 * text-level repair can fix, but a fresh sample from the same prompt is very
 * likely to come back well-formed, since this is sampling variance, not a
 * systematic prompt problem.
 *
 * Only NoObjectGeneratedError is retried here. Anything else (a real
 * rate-limit, an auth failure, a genuine schema violation the model
 * insists on) is a different problem resampling won't fix, so it's
 * rethrown immediately rather than burning retries on it.
 */
export async function withObjectRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!NoObjectGeneratedError.isInstance(error) || attempt === attempts) throw error;
    }
  }
  throw lastError;
}
