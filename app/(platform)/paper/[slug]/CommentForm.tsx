"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { addCommentAction } from "../../actions";

/**
 * Real comment form for a paper with an actual `posts` row. Posts through
 * addCommentAction (lib/data/adapter.ts's addComment, a real `comments`
 * insert) and reloads the page's server data via that action's
 * revalidatePath, so a posted comment shows up in the list above like any
 * other -- there is no separate client-side echo to keep in sync.
 */
export function CommentForm({ postId, slug, signedIn }: { postId: string; slug: string; signedIn: boolean }) {
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <p className="mt-s-6 rounded-md border border-dashed border-border px-s-4 py-s-4 font-sans text-sm leading-relaxed text-ink-faint">
        <Link href="/login" className="text-accent-text underline underline-offset-2">
          Sign in
        </Link>{" "}
        to join the discussion.
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;

    setError(null);
    setPending(true);
    try {
      await addCommentAction({ postId, slug, body: text });
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post that comment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-s-6 flex flex-col gap-s-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add to the discussion..."
        rows={3}
        maxLength={4000}
      />
      {error && <p className="font-sans text-sm text-unsupported">{error}</p>}
      <div>
        <Button type="submit" variant="primary" size="sm" disabled={pending || !body.trim()}>
          {pending ? "Posting…" : "Post comment"}
        </Button>
      </div>
    </form>
  );
}
