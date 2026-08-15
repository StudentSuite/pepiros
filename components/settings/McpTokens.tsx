"use client";

import { useState } from "react";
import { Copy, Plug, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/shadcn/alert-dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import type { MockMcpToken } from "@/lib/mock/settings";

/**
 * MCP token management.
 *
 * This is the one account feature with real backend code behind it
 * (lib/services/mcpAuth.ts and the mcp_tokens table), which is why it gets a
 * full section rather than a tab panel.
 *
 * A freshly created token is shown exactly once. That is not a UI flourish: a
 * token that can be re-read from a list is a token that leaks from a shared
 * screen or a screenshot.
 */
export function McpTokens({ initial }: { initial: MockMcpToken[] }) {
  const [tokens, setTokens] = useState(initial);
  const [label, setLabel] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<MockMcpToken | null>(null);

  function create(e: React.FormEvent) {
    e.preventDefault();
    const name = label.trim() || "Untitled token";
    const id = `tok-${Date.now()}`;
    // Demo-only value. Real tokens are minted server-side and HMAC-signed.
    const secret = `pep_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;

    setTokens((t) => [
      { id, label: name, createdAt: new Date().toISOString().slice(0, 10), lastUsed: null },
      ...t,
    ]);
    setRevealed(secret);
    setLabel("");
  }

  function confirmRevoke() {
    if (!revoking) return;
    setTokens((t) => t.filter((x) => x.id !== revoking.id));
    toast.success(`Revoked "${revoking.label}"`);
    setRevoking(null);
  }

  return (
    <div className="flex flex-col gap-s-5">
      {revealed && (
        <div className="rounded-md border border-accent/40 bg-accent-wash p-s-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-accent-text">
            Copy this now
          </p>
          <p className="mt-s-2 font-sans text-xs text-ink-muted">
            This is the only time the token is shown. If you lose it, revoke it
            and create another.
          </p>
          <div className="mt-s-3 flex items-center gap-s-2">
            <code className="min-w-0 flex-1 truncate rounded border border-border bg-surface px-s-3 py-s-2 font-mono text-xs text-ink">
              {revealed}
            </code>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={async () => {
                await navigator.clipboard.writeText(revealed);
                toast.success("Copied to clipboard");
              }}
            >
              <Copy className="size-3.5" />
              Copy
            </Button>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="mt-s-2"
            onClick={() => setRevealed(null)}
          >
            I have saved it
          </Button>
        </div>
      )}

      {tokens.length === 0 ? (
        <EmptyState
          icon={Plug}
          title="No MCP tokens yet."
          description="Create one to connect Claude, Codex, or Cursor to this account."
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-mono text-[11px] uppercase tracking-widest">
                  Label
                </TableHead>
                <TableHead className="font-mono text-[11px] uppercase tracking-widest">
                  Created
                </TableHead>
                <TableHead className="font-mono text-[11px] uppercase tracking-widest">
                  Last used
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-sans text-sm text-ink">{t.label}</TableCell>
                  <TableCell className="font-mono text-xs text-ink-muted">
                    {t.createdAt}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-ink-faint">
                    {t.lastUsed ?? "never"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Revoke ${t.label}`}
                      onClick={() => setRevoking(t)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <form onSubmit={create} className="flex flex-wrap items-end gap-s-3">
        <div className="min-w-0 flex-1 basis-[200px]">
          <Label htmlFor="tokenLabel">New token label</Label>
          <Input
            id="tokenLabel"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Claude Desktop"
            className="mt-s-2"
          />
        </div>
        <Button type="submit">Generate token</Button>
      </form>

      <AlertDialog open={Boolean(revoking)} onOpenChange={(o) => !o && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke &ldquo;{revoking?.label}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              Any agent using this token loses access immediately. This cannot be
              undone, but you can create a new token.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRevoke}>Revoke</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
