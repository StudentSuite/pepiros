"use client";

import { useState } from "react";
import { Copy, Plug, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
import { IconButton } from "@/components/ui/IconButton";
import { createMcpTokenAction, revokeMcpTokenAction } from "@/app/(app)/actions";
import type { McpTokenMeta } from "@/lib/services/mcpTokens";
import type { McpScope } from "@/lib/services/mcpAuth";

/**
 * MCP token management, wired to real server actions
 * (lib/services/mcpTokens.ts, hashed via lib/services/mcpAuth.ts) rather
 * than a client-side `Math.random()` string held in React state.
 *
 * A freshly created token is shown exactly once. That is not a UI flourish: a
 * token that can be re-read from a list is a token that leaks from a shared
 * screen or a screenshot -- and this one genuinely can't be re-read, because
 * only its hash is stored.
 */
export function McpTokens({ initial, readOnly = false }: { initial: McpTokenMeta[]; readOnly?: boolean }) {
  const [tokens, setTokens] = useState(initial);
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<McpScope>("read");
  const [pending, setPending] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<McpTokenMeta | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const { id, token } = await createMcpTokenAction({ label, scope });
      setTokens((t) => [
        { id, label: label.trim() || "Untitled token", scope, workspaceId: null, createdAt: new Date().toISOString(), lastUsedAt: null },
        ...t,
      ]);
      setRevealed(token);
      setLabel("");
      setScope("read");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create a token.");
    } finally {
      setPending(false);
    }
  }

  async function confirmRevoke() {
    if (!revoking) return;
    const target = revoking;
    setRevoking(null);
    try {
      await revokeMcpTokenAction(target.id);
      setTokens((t) => t.filter((x) => x.id !== target.id));
      toast.success(`Revoked "${target.label}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not revoke that token.");
    }
  }

  return (
    <div className="flex flex-col gap-s-5">
      {revealed && (
        <div className="rounded-md border border-accent/40 bg-accent-wash p-s-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-accent-text">
            Copy this now
          </p>
          <p className="mt-s-2 font-sans text-xs text-ink-muted">
            This is the only time the token is shown. Only its hash is stored, so
            if you lose it, revoke it and create another.
          </p>
          <div className="mt-s-3 flex items-center gap-s-2">
            <code className="min-w-0 flex-1 truncate rounded border border-border bg-surface px-s-3 py-s-2 font-mono text-xs text-ink">
              {revealed}
            </code>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={async () => {
                // Issue #216: writeText throws on an insecure context, in an
                // iframe, or when clipboard permission is denied -- unguarded,
                // that left the user with neither a success nor an error
                // toast, no feedback at all, for a token they can never see
                // again.
                try {
                  await navigator.clipboard.writeText(revealed);
                  toast.success("Copied to clipboard");
                } catch {
                  toast.error("Could not copy -- select and copy the token manually.");
                }
              }}
            >
              <Copy className="size-3.5" />
              Copy
            </Button>
          </div>
          <p className="mt-s-3 font-sans text-[11px] leading-relaxed text-ink-faint">
            Set this as <code className="text-ink">PEPIROS_MCP_TOKEN</code> in
            the environment of whatever runs <code className="text-ink">pepiros-mcp</code>
            /<code className="text-ink">npm run mcp:stdio</code>.
          </p>
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
                  Scope
                </TableHead>
                <TableHead className="font-mono text-[11px] uppercase tracking-widest">
                  Created
                </TableHead>
                <TableHead className="font-mono text-[11px] uppercase tracking-widest">
                  Last used
                </TableHead>
                <TableHead className="w-14" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-sans text-sm text-ink">{t.label}</TableCell>
                  <TableCell className="font-mono text-xs text-ink-muted">{t.scope}</TableCell>
                  <TableCell className="font-mono text-xs text-ink-muted">
                    {t.createdAt.slice(0, 10)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-ink-faint">
                    {t.lastUsedAt ? t.lastUsedAt.slice(0, 10) : "never"}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      icon={Trash2}
                      label={`Revoke ${t.label}`}
                      disabled={readOnly}
                      onClick={() => setRevoking(t)}
                    />
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
            disabled={readOnly}
            className="mt-s-2"
          />
        </div>
        <div className="flex flex-col gap-s-2">
          <Label htmlFor="tokenScope">Scope</Label>
          <select
            id="tokenScope"
            value={scope}
            onChange={(e) => setScope(e.target.value as McpScope)}
            disabled={readOnly}
            className="h-9 rounded border border-border bg-surface-sunken px-s-3 font-sans text-sm text-ink"
          >
            <option value="read">Read-only</option>
            <option value="write">Read + write</option>
          </select>
        </div>
        <Button type="submit" variant="primary" disabled={pending || readOnly}>
          {pending ? "Generating…" : "Generate token"}
        </Button>
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
            <AlertDialogAction variant="destructive" onClick={confirmRevoke}>
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
