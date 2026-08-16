"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import clsx from "clsx";

/**
 * Rich-text editor for a node's bodyMd. `onSave` is expected to persist (see
 * NodeInspector's caller, which PATCHes /api/nodes/[id]) and only resolves
 * once that's settled -- `saving` disables the button and relabels it so a
 * slow save can't be double-submitted or look like a no-op.
 */
export function NodeEditor({
  initialContent,
  saving = false,
  onSave,
  onCancel,
}: {
  initialContent: string;
  saving?: boolean;
  onSave?: (html: string) => void;
  onCancel?: () => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    // Next 15 / React 19 SSR renders the app shell before the editor mounts;
    // this avoids a hydration mismatch warning from Tiptap's own DOM render.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "font-serif text-sm leading-relaxed text-ink focus:outline-none min-h-[6rem]",
      },
    },
  });

  return (
    <div className="rounded border border-border-strong bg-surface-sunken p-3">
      <div className="mb-2 flex gap-1 border-b border-border pb-2">
        {(
          [
            ["Bold", () => editor?.chain().focus().toggleBold().run()],
            ["Italic", () => editor?.chain().focus().toggleItalic().run()],
            ["List", () => editor?.chain().focus().toggleBulletList().run()],
          ] as const
        ).map(([label, action]) => (
          <button
            key={label}
            type="button"
            onClick={action}
            className="rounded px-2 py-0.5 font-sans text-xs text-ink-muted hover:bg-surface-raised hover:text-ink"
          >
            {label}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded border border-border px-3 py-1 font-sans text-xs text-ink-muted hover:text-ink disabled:pointer-events-none disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          // getText(), not getHTML(): bodyMd is plain text with inline
          // `[^id]` citation markers (NodeInspector's renderBodyWithCitations,
          // lib/prompts/contextBlock.ts), never HTML -- saving Tiptap's HTML
          // output showed up as literal `<p>...</p>` tags once Save actually
          // persisted and re-rendered it (it never used to re-render at all).
          onClick={() => onSave?.(editor?.getText() ?? initialContent)}
          disabled={saving}
          className={clsx(
            "rounded bg-pillar-4/20 px-3 py-1 font-sans text-xs text-ink hover:bg-pillar-4/30 disabled:pointer-events-none disabled:opacity-60",
          )}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
