"use client";

import { useState, useTransition, type FormEvent } from "react";
import { UserRound, X } from "lucide-react";
import {
  getDocumentShares,
  removeShare,
  shareDocument,
  updateSharePermission,
  type Collaborator,
} from "@/app/documents/[id]/share-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type OwnerSummary = { name: string; email: string };

export function ShareDialog({ documentId, owner }: { documentId: string; owner: OwnerSummary }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"viewer" | "editor">("viewer");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [pending, startAction] = useTransition();

  function loadCollaborators() {
    setLoadingError(null);
    startLoading(async () => {
      try {
        const result = await getDocumentShares(documentId);
        if ("error" in result) {
          setLoadingError(result.error);
          return;
        }
        setCollaborators(result.collaborators);
      } catch {
        setLoadingError("Could not load collaborators. Please try again.");
      }
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setError(null);
      setMessage(null);
      loadCollaborators();
    }
  }

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    startAction(async () => {
      try {
        const result = await shareDocument(documentId, email, permission);
        if (!result.success) {
          setError(result.error);
          return;
        }
        setMessage(result.message ?? "Document access updated.");
        setEmail("");
        const refreshed = await getDocumentShares(documentId);
        if ("collaborators" in refreshed) setCollaborators(refreshed.collaborators);
        else setLoadingError(refreshed.error);
      } catch {
        setError("Could not share the document. Please try again.");
      }
    });
  }

  function changePermission(collaborator: Collaborator, nextPermission: "viewer" | "editor") {
    if (nextPermission === collaborator.permission) return;
    setError(null);
    setMessage(null);
    startAction(async () => {
      try {
        const result = await updateSharePermission(collaborator.id, nextPermission);
        if (!result.success) {
          setError(result.error);
          return;
        }
        setCollaborators((current) => current.map((item) =>
          item.id === collaborator.id ? { ...item, permission: nextPermission } : item,
        ));
        setMessage(result.message ?? "Permission updated.");
      } catch {
        setError("Could not update this collaborator. Please try again.");
      }
    });
  }

  function handleRemove(collaborator: Collaborator) {
    setError(null);
    setMessage(null);
    startAction(async () => {
      try {
        const result = await removeShare(collaborator.id);
        if (!result.success) {
          setError(result.error);
          return;
        }
        setCollaborators((current) => current.filter((item) => item.id !== collaborator.id));
        setMessage(result.message ?? "Collaborator removed.");
      } catch {
        setError("Could not remove this collaborator. Please try again.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" aria-label="Share document" /> }>
        <UserRound className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Share</span>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
          <DialogDescription>Invite someone by email and choose their access level.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAdd} className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-end">
            <div className="space-y-1.5">
              <label htmlFor={`share-email-${documentId}`} className="text-sm font-medium">Email address</label>
              <Input
                id={`share-email-${documentId}`}
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`share-permission-${documentId}`} className="text-sm font-medium">Permission</label>
              <select
                id={`share-permission-${documentId}`}
                value={permission}
                onChange={(event) => setPermission(event.target.value as "viewer" | "editor")}
                disabled={pending}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
            </div>
            <Button type="submit" disabled={pending || !email.trim()}>{pending ? "Working..." : "Add"}</Button>
          </div>
        </form>

        {(error || loadingError) && <p className="text-sm text-destructive" role="alert">{error ?? loadingError}</p>}
        {message && <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">{message}</p>}

        <section className="space-y-3" aria-label="People with access">
          <h3 className="text-sm font-semibold">People with access</h3>
          <ul className="divide-y rounded-lg border">
            <li className="flex items-center gap-3 p-3">
              <Avatar name={owner.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{owner.name || "Owner"}</p>
                <p className="truncate text-xs text-muted-foreground">{owner.email}</p>
              </div>
              <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">Owner</span>
            </li>
            {loading ? (
              <li className="space-y-2 p-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></li>
            ) : collaborators.length === 0 ? (
              <li className="p-4 text-center text-sm text-muted-foreground">No collaborators yet.</li>
            ) : collaborators.map((collaborator) => (
              <li key={collaborator.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                <Avatar name={collaborator.name ?? collaborator.email} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{collaborator.name || collaborator.email}</p>
                  {collaborator.name && <p className="truncate text-xs text-muted-foreground">{collaborator.email}</p>}
                </div>
                <select
                  aria-label={`Permission for ${collaborator.email}`}
                  value={collaborator.permission}
                  onChange={(event) => changePermission(collaborator, event.target.value as "viewer" | "editor")}
                  disabled={pending}
                  className="h-8 rounded-lg border border-input bg-background px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${collaborator.email}`}
                  title="Remove access"
                  disabled={pending}
                  onClick={() => handleRemove(collaborator)}
                >
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary" aria-hidden="true">
      {name.trim().slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}
