import { ReaderSkeleton } from "@/components/reader/ReaderSkeleton";

/**
 * Issue #390: the reader is the slowest surface in the app (workspace, PDF,
 * graph, and evidence all load before anything useful renders), and it was
 * the one route with no route-level loading.tsx -- ReaderClient.tsx hand
 * rolled its own skeleton, but that only ever showed after the client
 * bundle had loaded and hydrated. This is the same skeleton, shown while
 * the server is still preparing the page.
 */
export default function Loading() {
  return <ReaderSkeleton />;
}
