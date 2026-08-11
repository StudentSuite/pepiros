import { Badge } from "./Badge";

/** Mono-set chip for a stable citation id (C7, N12, e6, ...). */
export function RefChip({ refId, className }: { refId: string; className?: string }) {
  return (
    <Badge variant="tag" className={className}>
      {refId}
    </Badge>
  );
}
