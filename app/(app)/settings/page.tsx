"use client";

import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { Panel } from "@/components/ui/Panel";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { useToastStore } from "@/lib/store/toast";
import { mockProfile, mockMcpTokens, type MockMcpToken } from "@/lib/mock/settings";

const TABS: TabItem[] = [
  { value: "profile", label: "Profile" },
  { value: "tokens", label: "MCP tokens" },
  { value: "notifications", label: "Notifications" },
  { value: "danger", label: "Danger zone" },
];

const NOTIFICATION_PREFS = [
  { id: "follow", label: "Someone follows you" },
  { id: "comment", label: "New comment on your paper" },
  { id: "like", label: "Someone likes your paper" },
  { id: "digest", label: "Weekly activity digest" },
];

type DangerAction = "workspace" | "account" | null;

/**
 * `/settings` -- authenticated-only, `app/(app)/` has no shared layout, so
 * this page rolls its own minimal top bar (same pattern as `/workspaces`,
 * `/welcome`). Plain dark-chrome `Panel`s throughout: this is an app-chrome
 * settings surface, not reading content, so `.surface-reading` doesn't
 * apply here. Every mutation is local `useState` only (Global Constraints:
 * no persistence, no fetch).
 */
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

  // Profile panel: local copies of the mock profile fields, save just toasts.
  const [name, setName] = useState(mockProfile.name);
  const [email, setEmail] = useState(mockProfile.email);

  // MCP tokens panel: local copy of the mock array so revoke/generate never
  // mutate the imported const.
  const [tokens, setTokens] = useState<MockMcpToken[]>(mockMcpTokens);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);

  // Notifications panel: local toggle state only.
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    follow: true,
    comment: true,
    like: false,
    digest: true,
  });

  // Danger zone: which confirm dialog (if any) is open.
  const [dangerAction, setDangerAction] = useState<DangerAction>(null);

  function handleSaveProfile() {
    useToastStore.getState().push("Saved", "success");
  }

  function handleRevoke(id: string) {
    setTokens((prev) => prev.filter((t) => t.id !== id));
    useToastStore.getState().push("Token revoked", "info");
  }

  function handleGenerateToken() {
    const id = `tok-${Date.now()}`;
    const placeholder = `pep_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
    setTokens((prev) => [
      ...prev,
      { id, label: "New token", createdAt: new Date().toISOString().slice(0, 10), lastUsed: null },
    ]);
    setRevealedToken(placeholder);
  }

  function toggleNotifPref(id: string) {
    setNotifPrefs((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function confirmDangerAction() {
    const message = dangerAction === "workspace" ? "Workspace deleted" : "Account deleted";
    setDangerAction(null);
    useToastStore.getState().push(message, "success");
  }

  return (
    <main className="min-h-screen bg-surface px-6 pb-24 pt-10 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Logo />

        <div className="mt-10">
          <h1 className="font-serif text-2xl text-ink">Settings</h1>
          <p className="mt-1 font-sans text-sm text-ink-muted">
            Manage your profile, MCP access, and notification preferences.
          </p>
        </div>

        <div className="mt-8">
          <Tabs tabs={TABS} value={activeTab} onChange={setActiveTab} />
        </div>

        <div className="mt-6">
          {activeTab === "profile" && (
            <Panel padded className="flex flex-col gap-4">
              <FormField label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </FormField>
              <FormField label="Email">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormField>
              <div>
                <Button variant="primary" onClick={handleSaveProfile}>
                  Save
                </Button>
              </div>
            </Panel>
          )}

          {activeTab === "tokens" && (
            <Panel padded className="flex flex-col gap-4">
              {revealedToken && (
                <div className="flex flex-col gap-1.5 rounded-md border border-located/60 bg-surface-sunken p-3">
                  <p className="font-sans text-xs text-ink-muted">
                    Copy this token now, you won&apos;t be able to see it again.
                  </p>
                  <p className="break-all font-mono text-sm text-ink">{revealedToken}</p>
                </div>
              )}

              {tokens.length === 0 ? (
                <p className="font-sans text-sm text-ink-muted">No tokens yet.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {tokens.map((token) => (
                    <li key={token.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-col gap-1">
                        <span className="font-sans text-sm text-ink">{token.label}</span>
                        <span className="font-mono text-xs text-ink-faint">
                          created {token.createdAt} &middot; last used{" "}
                          {token.lastUsed ?? "never"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRevoke(token.id)}
                        className="font-sans text-xs text-unsupported transition duration-fast ease-out hover:underline"
                      >
                        Revoke
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div>
                <Button variant="secondary" onClick={handleGenerateToken}>
                  Generate new token
                </Button>
              </div>
            </Panel>
          )}

          {activeTab === "notifications" && (
            <Panel padded className="flex flex-col gap-4">
              {NOTIFICATION_PREFS.map((pref) => (
                <label
                  key={pref.id}
                  className="flex items-center justify-between gap-4 font-sans text-sm text-ink"
                >
                  {pref.label}
                  <input
                    type="checkbox"
                    checked={notifPrefs[pref.id] ?? false}
                    onChange={() => toggleNotifPref(pref.id)}
                    className="h-4 w-4 rounded border-border-strong bg-surface-sunken accent-accent"
                  />
                </label>
              ))}
            </Panel>
          )}

          {activeTab === "danger" && (
            <Panel padded className="flex flex-col divide-y divide-border">
              <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
                <div>
                  <p className="font-sans text-sm text-ink">Delete workspace</p>
                  <p className="font-sans text-xs text-ink-faint">
                    Removes the current workspace and its reading graph.
                  </p>
                </div>
                <Button variant="danger" size="sm" onClick={() => setDangerAction("workspace")}>
                  Delete workspace
                </Button>
              </div>
              <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
                <div>
                  <p className="font-sans text-sm text-ink">Delete account</p>
                  <p className="font-sans text-xs text-ink-faint">
                    Permanently removes your account and all workspaces.
                  </p>
                </div>
                <Button variant="danger" size="sm" onClick={() => setDangerAction("account")}>
                  Delete account
                </Button>
              </div>
            </Panel>
          )}
        </div>
      </div>

      <Dialog
        open={dangerAction !== null}
        onClose={() => setDangerAction(null)}
        title={dangerAction === "workspace" ? "Delete workspace?" : "Delete account?"}
      >
        <p className="font-sans text-sm text-ink-muted">
          {dangerAction === "workspace"
            ? "This will permanently delete this workspace and its reading graph. This cannot be undone."
            : "This will permanently delete your account and all workspaces. This cannot be undone."}
          <Badge variant="tag" className="ml-2">
            demo, no data is actually deleted
          </Badge>
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setDangerAction(null)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={confirmDangerAction}>
            Confirm
          </Button>
        </div>
      </Dialog>
    </main>
  );
}
