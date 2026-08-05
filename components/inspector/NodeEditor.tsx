"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import clsx from "clsx";

/**
 * Rich-text editor for a node's bodyMd. Local state only this pass -- no
 * save-to-backend wiring exists yet (node_versions table isn't written from
 * here), so `onSave` is a stub the caller can console.log from.
 */
export function NodeEditor({
  initialContent,
  onSave,
  onCancel,
}: {
  initialContent: string;
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
          className="rounded border border-border px-3 py-1 font-sans text-xs text-ink-muted hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            const html = editor?.getHTML() ?? initialContent;
             
            console.log("save node body (stub, no backend write yet):", html);
            onSave?.(html);
          }}
          className={clsx(
            "rounded bg-pillar-4/20 px-3 py-1 font-sans text-xs text-ink hover:bg-pillar-4/30",
          )}
        >
          Save
        </button>
      </div>
    </div>
  );
}
