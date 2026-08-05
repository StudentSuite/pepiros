import { ShareClient } from "./ShareClient";

export default async function SharePage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  return <ShareClient shareToken={shareToken} />;
}
