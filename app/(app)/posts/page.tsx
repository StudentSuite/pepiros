import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getAdapter } from "@/lib/data/adapter";
import { Button } from "@/components/shadcn/button";
import { PostsList } from "@/components/dashboard/PostsList";
import { deletePostsAction } from "../actions";

export const metadata: Metadata = { title: "My posts" };

export default async function PostsPage() {
  const profile = await getSession();
  if (!profile) redirect("/login");

  const posts = await getAdapter().listPosts(profile.id);

  return (
    <div className="mx-auto w-full max-w-3xl p-s-5">
      <header className="flex flex-wrap items-start justify-between gap-s-4 pb-s-5">
        <div>
          <h1 className="font-serif text-2xl leading-tight text-ink">Posts</h1>
          <p className="mt-s-2 font-sans text-sm text-ink-muted">
            Everything you have published, drafted, or archived.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/upload">
            <Plus className="size-3.5" />
            New post
          </Link>
        </Button>
      </header>

      <PostsList
        posts={posts}
        onDelete={async (ids) => {
          "use server";
          await deletePostsAction(ids);
        }}
      />
    </div>
  );
}
