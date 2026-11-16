"use client";

import { useActionState, useState } from "react";
import { Upload } from "lucide-react";
import { importDocument, type ActionState } from "@/app/dashboard/actions";
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

const initialState: ActionState = {};

export function ImportDocumentDialog() {
  const [state, formAction, pending] = useActionState(importDocument, initialState);
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline"><Upload className="size-4" aria-hidden="true" />Import</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import a document</DialogTitle>
          <DialogDescription>Supported files: .txt and .md, up to 500 KB</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input
            type="file"
            name="file"
            accept=".txt,.md,text/plain,text/markdown"
            required
            disabled={pending}
            aria-label="Choose a TXT or Markdown file"
            className="block w-full cursor-pointer rounded-lg border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
          {state.error && <p className="text-sm text-destructive" role="alert">{state.error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Importing..." : "Import document"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
