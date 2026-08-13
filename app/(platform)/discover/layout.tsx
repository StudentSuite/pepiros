import type { Metadata } from "next";

// page.tsx is a client component (search/sort/filter state), which can't
// export `metadata` itself -- this thin server layout carries it instead.
export const metadata: Metadata = {
  title: "Discover",
  description: "Browse the public library of papers on Pepiros, every claim traced to its source.",
};

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
