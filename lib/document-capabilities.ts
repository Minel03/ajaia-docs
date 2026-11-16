export type DocumentRole = "owner" | "editor" | "viewer";

export function getDocumentCapabilities(role: DocumentRole) {
  return {
    canEdit: role !== "viewer",
    canShare: role === "owner",
  };
}
