import Link from "next/link";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DocumentActions } from "@/components/document-actions";

export type DocumentListItem = {
  id: string;
  title: string;
  updated_at: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  permission?: "viewer" | "editor";
  shared?: boolean;
  canRename: boolean;
  canDelete: boolean;
};

function relativeTime(value: string) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, duration] of units) {
    if (Math.abs(seconds) >= duration) return formatter.format(Math.round(seconds / duration), unit);
  }
  return formatter.format(0, "second");
}

export function DocumentList({ documents, emptyTitle = "No documents yet" }: {
  documents: DocumentListItem[];
  emptyTitle?: string;
}) {
  if (documents.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 text-center">
        <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FileText className="size-5" aria-hidden="true" />
        </span>
        <h2 className="font-medium">{emptyTitle}</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Documents you create or can access will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {documents.map((document) => (
        <li key={document.id} className="flex items-center gap-3 px-4 py-4 sm:px-5">
          <span className="hidden size-10 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary sm:flex">
            <FileText className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/documents/${document.id}`} className="truncate text-sm font-medium hover:underline">
                {document.title}
              </Link>
              {document.shared && <Badge variant="outline">Shared</Badge>}
              {document.permission && <Badge variant="secondary">{document.permission}</Badge>}
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {document.ownerEmail
                ? `Shared by ${document.ownerName ? `${document.ownerName} · ` : ""}${document.ownerEmail} · `
                : ""}
              Updated {relativeTime(document.updated_at)}
            </p>
          </div>
          <DocumentActions
            documentId={document.id}
            title={document.title}
            canRename={document.canRename}
            canDelete={document.canDelete}
          />
        </li>
      ))}
    </ul>
  );
}
