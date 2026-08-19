import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getAdapter } from "@/lib/data/adapter";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { PostsList } from "@/components/dashboard/PostsList";
import { deletePostsAction } from "../actions";

export const metadata: Metadata = { title: "My posts" };

export default async function PostsPage() {
  const profile = await getSession();
  if (!profile) redirect("/login");

  const posts = await getAdapter().listPosts(profile.id);

  return (
    <div className="mx-auto w-full max-w-3xl p-s-5">
      {/* Issue #141: was a hand-rolled header (text-2xl title, mt-s-2
          description) instead of the shared PageHeader every sibling page
          (home/workspaces/analytics/comments) uses -- the most-used page in
          the nav had a visibly larger, differently-spaced title than the
          rest of the shell. */}
      <PageHeader
        title="Posts"
        description="Everything you have published, drafted, or archived."
        primaryAction={{ label: "New post", href: "/upload" }}
      />

      <div className="mt-s-5">
        <PostsList
          posts={posts}
          onDelete={async (ids) => {
            "use server";
            await deletePostsAction(ids);
          }}
        />
      </div>
    </div>
  );
}
