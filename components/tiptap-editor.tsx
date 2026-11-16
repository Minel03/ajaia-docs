"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { JSONContent } from "@tiptap/core";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Share2,
  Underline,
  Undo2,
} from "lucide-react";
import { renameDocument, updateDocumentContent, type ActionState } from "@/app/dashboard/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DocumentRole = "owner" | "editor" | "viewer";
type SaveStatus = "saved" | "saving" | "unsaved" | "error";

export function TiptapEditor({
  documentId,
  initialTitle,
  initialContent,
  role,
}: {
  documentId: string;
  initialTitle: string;
  initialContent: JSONContent;
  role: DocumentRole;
}) {
  const canEdit = role !== "viewer";
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editRevision, setEditRevision] = useState(0);
  const [title, setTitle] = useState(initialTitle);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [titlePending, startTitleTransition] = useTransition();
  const [savePending, startSaveTransition] = useTransition();
  const latestContent = useRef<JSONContent>(initialContent);
  const editVersion = useRef(0);
  const savedVersion = useRef(0);
  const saveInProgress = useRef(false);
  const saveLatestRef = useRef<() => void>(() => {});
  const savedTitle = useRef(initialTitle);

  const saveLatest = useCallback(() => {
    if (!canEdit || saveInProgress.current || editVersion.current === savedVersion.current) return;

    saveInProgress.current = true;
    const versionBeingSaved = editVersion.current;
    const contentBeingSaved = latestContent.current;
    setSaveStatus("saving");
    setSaveError(null);

    startSaveTransition(async () => {
      let succeeded = false;
      try {
        const result: ActionState = await updateDocumentContent(documentId, contentBeingSaved);
        if (!result.success) {
          setSaveStatus("error");
          setSaveError(result.error ?? "Could not save the document.");
          return;
        }
        savedVersion.current = versionBeingSaved;
        succeeded = true;
      } catch (error) {
        setSaveStatus("error");
        setSaveError(error instanceof Error ? error.message : "Could not save the document.");
      } finally {
        saveInProgress.current = false;
        if (succeeded && editVersion.current > versionBeingSaved) {
          setSaveStatus("unsaved");
          saveLatestRef.current();
        } else if (succeeded) {
          setSaveStatus("saved");
          setSaveError(null);
        }
      }
    });
  }, [canEdit, documentId, startSaveTransition]);

  useEffect(() => {
    saveLatestRef.current = saveLatest;
  }, [saveLatest]);

  const editor = useEditor({
    immediatelyRender: false,
    editable: canEdit,
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } })],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "tiptap-content",
        "aria-label": canEdit ? "Document content" : "Document content, view only",
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      latestContent.current = updatedEditor.getJSON();
      editVersion.current += 1;
      setEditRevision((revision) => revision + 1);
      setSaveStatus("unsaved");
      setSaveError(null);
    },
  });

  useEffect(() => {
    if (!canEdit || editVersion.current === savedVersion.current) return;
    const timeout = window.setTimeout(() => saveLatestRef.current(), 1000);
    return () => window.clearTimeout(timeout);
  }, [canEdit, editRevision]);

  useEffect(() => {
    function flushWhenHidden() {
      if (document.visibilityState === "hidden") saveLatestRef.current();
    }
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      document.removeEventListener("visibilitychange", flushWhenHidden);
      saveLatestRef.current();
    };
  }, []);

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (editVersion.current === savedVersion.current && !saveInProgress.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, []);

  function saveTitle() {
    if (!canEdit || titlePending) return;
    const nextTitle = title.trim();
    if (!nextTitle) {
      setTitle(savedTitle.current);
      setTitleError("Title cannot be empty.");
      return;
    }
    if (nextTitle === savedTitle.current) {
      setTitle(nextTitle);
      setTitleError(null);
      return;
    }

    setTitle(nextTitle);
    setTitleError(null);
    const formData = new FormData();
    formData.set("id", documentId);
    formData.set("title", nextTitle);
    startTitleTransition(async () => {
      try {
        const result = await renameDocument(formData);
        if (!result.success) {
          setTitle(savedTitle.current);
          setTitleError(result.error ?? "Could not rename the document.");
          return;
        }
        savedTitle.current = nextTitle;
        setTitle(nextTitle);
      } catch (error) {
        setTitle(savedTitle.current);
        setTitleError(error instanceof Error ? error.message : "Could not rename the document.");
      }
    });
  }

  const statusText = saveStatus === "saved"
    ? "Saved"
    : saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "unsaved"
        ? "Unsaved changes"
        : "Error";

  return (
    <main className="min-h-screen bg-muted/30 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 rounded-xl border bg-card p-3 shadow-sm sm:p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/dashboard" className="shrink-0 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
              ← <span className="hidden sm:inline">My Documents</span><span className="sr-only">Back to My Documents</span>
            </Link>
            <div className="min-w-0 flex-1">
              <Input
                aria-label="Document title"
                value={title}
                disabled={!canEdit || titlePending}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={saveTitle}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                }}
                className="h-10 border-transparent bg-transparent px-2 text-lg font-semibold shadow-none hover:border-border focus-visible:border-border sm:text-xl"
              />
              {titleError && <p className="px-2 pt-1 text-xs text-destructive" role="alert">{titleError}</p>}
            </div>
            {role === "viewer" && <Badge variant="secondary">View only</Badge>}
            <div className="ml-auto flex items-center gap-2">
              <div className="flex min-w-24 items-center justify-end gap-1.5 text-xs text-muted-foreground" aria-live="polite">
                {saveStatus === "error" ? (
                  <>
                    <span>{statusText}{saveError ? `: ${saveError}` : ""}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => saveLatestRef.current()} disabled={savePending}>
                      Retry
                    </Button>
                  </>
                ) : <span>{statusText}</span>}
              </div>
              <span title="Coming soon">
                <Button type="button" variant="outline" size="sm" disabled title="Coming soon" aria-label="Share, coming soon">
                  <Share2 className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
              </span>
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-1 border-b bg-muted/20 p-2" role="toolbar" aria-label="Text formatting">
            <ToolbarButton label="Bold" active={editor?.isActive("bold") ?? false} disabled={!canEdit || !editor} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold /></ToolbarButton>
            <ToolbarButton label="Italic" active={editor?.isActive("italic") ?? false} disabled={!canEdit || !editor} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic /></ToolbarButton>
            <ToolbarButton label="Underline" active={editor?.isActive("underline") ?? false} disabled={!canEdit || !editor} onClick={() => editor?.chain().focus().toggleUnderline().run()}><Underline /></ToolbarButton>
            <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
            <ToolbarButton label="Heading 1" active={editor?.isActive("heading", { level: 1 }) ?? false} disabled={!canEdit || !editor} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 /></ToolbarButton>
            <ToolbarButton label="Heading 2" active={editor?.isActive("heading", { level: 2 }) ?? false} disabled={!canEdit || !editor} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 /></ToolbarButton>
            <ToolbarButton label="Heading 3" active={editor?.isActive("heading", { level: 3 }) ?? false} disabled={!canEdit || !editor} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 /></ToolbarButton>
            <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
            <ToolbarButton label="Bulleted list" active={editor?.isActive("bulletList") ?? false} disabled={!canEdit || !editor} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List /></ToolbarButton>
            <ToolbarButton label="Numbered list" active={editor?.isActive("orderedList") ?? false} disabled={!canEdit || !editor} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered /></ToolbarButton>
            <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
            <ToolbarButton label="Undo" active={false} disabled={!canEdit || !editor} onClick={() => editor?.chain().focus().undo().run()}><Undo2 /></ToolbarButton>
            <ToolbarButton label="Redo" active={false} disabled={!canEdit || !editor} onClick={() => editor?.chain().focus().redo().run()}><Redo2 /></ToolbarButton>
          </div>
          <EditorContent editor={editor} className="tiptap-page" />
        </section>
      </div>
    </main>
  );
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
