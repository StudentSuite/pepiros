import { describe, expect, it } from "vitest";
import { callbackUrl, initialsFor, profileFromGoogle, usernameFor } from "./google";

const USERNAME_RULE = /^[a-z0-9_]{3,30}$/;

describe("usernameFor", () => {
  // profiles.username is constrained to ^[a-z0-9_]{3,30}$ in
  // supabase/migrations/0001_platform.sql, so anything derived from a Google
  // account has to survive that check or the insert fails.
  it("produces a username matching the database constraint", () => {
    const cases = [
      { id: "abc12345", email: "Alex.Smith@example.com", name: "Alex Smith" },
      { id: "9f8e7d6c", email: "a@b.co", name: "A" }, // too short before padding
      { id: "11112222", email: null, name: "Zoë Ünicode" }, // non-ascii
      { id: "33334444", email: "a.very.long.email.address.indeed@example.com", name: null },
      { id: "55556666", email: null, name: null }, // nothing to work with
    ];

    for (const c of cases) {
      const username = usernameFor(c);
      expect(username, `failed for ${JSON.stringify(c)}`).toMatch(USERNAME_RULE);
    }
  });

  it("gives two people with the same email local part different usernames", () => {
    const a = usernameFor({ id: "aaaa1111", email: "alex@one.com", name: null });
    const b = usernameFor({ id: "bbbb2222", email: "alex@two.com", name: null });
    expect(a).not.toBe(b);
  });

  it("is stable for the same account", () => {
    const identity = { id: "abc12345", email: "alex@example.com", name: "Alex" };
    expect(usernameFor(identity)).toBe(usernameFor(identity));
  });
});

describe("initialsFor", () => {
  it("takes initials from a two-part name", () => {
    expect(initialsFor("Alex Smith", null)).toBe("AS");
  });

  // Only the local part: splitting the whole address would take the second
  // letter from the domain, so alex@example.com would read "AE" -- the
  // company's initial rather than the person's.
  it("takes email initials from the local part, not the domain", () => {
    expect(initialsFor(null, "alex@example.com")).toBe("AL");
    expect(initialsFor(null, "alex.smith@example.com")).toBe("AS");
  });

  it("never returns an empty string", () => {
    expect(initialsFor(null, null)).toBe("??");
    expect(initialsFor("", "")).toBe("??");
  });
});

describe("profileFromGoogle", () => {
  it("carries the account id through as the profile id", () => {
    const profile = profileFromGoogle({ id: "uid-1", email: "a@b.com", name: "A B" });
    expect(profile.id).toBe("uid-1");
    expect(profile.displayName).toBe("A B");
    expect(profile.onboarded).toBe(true);
  });

  it("still produces a display name when Google sends no name", () => {
    const profile = profileFromGoogle({ id: "uid-2", email: "solo@example.com", name: null });
    expect(profile.displayName).toBe("solo");
  });

  it("falls back when Google sends neither name nor email", () => {
    expect(profileFromGoogle({ id: "uid-3", email: null, name: null }).displayName).toBe("Reader");
  });
});

describe("callbackUrl", () => {
  it("round-trips the post-login destination", () => {
    const url = new URL(callbackUrl("https://app.test", "/w/ws-1"));
    expect(url.pathname).toBe("/auth/callback");
    expect(url.searchParams.get("next")).toBe("/w/ws-1");
  });

  it("omits next when there isn't one", () => {
    expect(new URL(callbackUrl("https://app.test", "")).searchParams.has("next")).toBe(false);
  });
});
