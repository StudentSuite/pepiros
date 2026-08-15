import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getAdapter } from "@/lib/data/adapter";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { PostsTable } from "@/components/dashboard/PostsTable";
import { deletePostsAction } from "../actions";

export const metadata: Metadata = { title: "My posts" };

export default async function PostsPage() {
  const profile = await getSession();
  if (!profile) redirect("/login");

  const posts = await getAdapter().listPosts(profile.id);

  return (
    <div className="mx-auto w-full max-w-6xl p-s-5">
      <PageHeader
        title="My posts"
        description="Everything you have published, drafted, or archived."
        primaryAction={{ label: "New post", href: "/upload" }}
      />
      <div className="mt-s-5">
        <PostsTable
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
