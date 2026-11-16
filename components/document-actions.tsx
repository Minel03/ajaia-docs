"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { deleteDocument, renameDocument, type ActionState } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DocumentActions({
  documentId,
  title,
  canRename,
  canDelete,
}: {
  documentId: string;
  title: string;
  canRename: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [renamePending, startRename] = useTransition();
  const [deletePending, startDelete] = useTransition();

  if (!canRename && !canDelete) return null;

  function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startRename(async () => {
      const result: ActionState = await renameDocument(formData);
      if (result.success) {
        setRenameOpen(false);
        router.refresh();
      } else {
        setRenameError(result.error ?? "Could not rename the document.");
      }
    });
  }

  function submitDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startDelete(async () => {
      const result: ActionState = await deleteDocument(formData);
      if (result.success) {
        setDeleteOpen(false);
        router.refresh();
      } else {
        setDeleteError(result.error ?? "Could not delete the document.");
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Actions for ${title}`} />}
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canRename && <DropdownMenuItem onClick={() => { setRenameError(null); setRenameOpen(true); }}><Pencil />Rename</DropdownMenuItem>}
          {canDelete && <DropdownMenuItem variant="destructive" onClick={() => { setDeleteError(null); setDeleteOpen(true); }}><Trash2 />Delete</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      {canRename && (
        <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename document</DialogTitle>
              <DialogDescription>Choose a title between 1 and 200 characters.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submitRename} className="space-y-4">
              <input type="hidden" name="id" value={documentId} />
              <div className="space-y-2">
                <Label htmlFor={`title-${documentId}`}>Title</Label>
                <Input id={`title-${documentId}`} name="title" defaultValue={title} maxLength={200} required />
              </div>
              {renameError && <p className="text-sm text-destructive" role="alert">{renameError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={renamePending}>{renamePending ? "Saving..." : "Save title"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {canDelete && (
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete document?</DialogTitle>
              <DialogDescription>This permanently deletes “{title}”. This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submitDelete}>
              <input type="hidden" name="id" value={documentId} />
              {deleteError && <p className="mb-4 text-sm text-destructive" role="alert">{deleteError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                <Button type="submit" variant="destructive" disabled={deletePending}>
                  {deletePending ? "Deleting..." : "Delete document"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
