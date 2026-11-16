"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { createDocument, type ActionState } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";

const initialState: ActionState = {};

export function CreateDocumentButton() {
  const [state, formAction, pending] = useActionState(createDocument, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="title" value="Untitled document" />
      <Button type="submit" disabled={pending}>
        <Plus className="size-4" aria-hidden="true" />
        {pending ? "Creating..." : "New document"}
      </Button>
      {state.error && <p className="text-sm text-destructive" role="alert">{state.error}</p>}
    </form>
  );
}
