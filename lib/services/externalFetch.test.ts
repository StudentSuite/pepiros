import { describe, expect, it } from "vitest";
import { ExternalApiError, classifyExternalError } from "./externalFetch";

describe("classifyExternalError", () => {
  it("classifies 429 as rate_limited", () => {
    expect(classifyExternalError(new ExternalApiError("x", 429))).toBe("rate_limited");
  });

  // Observed directly against the live OpenAlex API while building citationExpand.ts:
  // anonymous search returns a plain 503 with Retry-After when its search cluster is
  // overloaded, not a 429 -- callers shouldn't have to know that to get the right message.
  it("classifies 503 as rate_limited", () => {
    expect(classifyExternalError(new ExternalApiError("x", 503))).toBe("rate_limited");
  });

  it("classifies any other status as a generic error", () => {
    expect(classifyExternalError(new ExternalApiError("x", 500))).toBe("error");
    expect(classifyExternalError(new ExternalApiError("x", 404))).toBe("error");
  });

  it("classifies a non-ExternalApiError as a generic error", () => {
    expect(classifyExternalError(new Error("network down"))).toBe("error");
    expect(classifyExternalError("not even an error")).toBe("error");
  });
});
