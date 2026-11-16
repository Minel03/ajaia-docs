import { z } from "zod";

export const documentIdSchema = z.uuid("Invalid document ID.");
export const shareIdSchema = z.uuid("Invalid share ID.");
export const titleSchema = z.string().trim()
  .min(1, "Title cannot be empty.")
  .max(200, "Title must be 200 characters or fewer.");
export const createDocumentSchema = z.object({ title: z.literal("Untitled document") }).strict();
export const renameDocumentSchema = z.object({ id: documentIdSchema, title: titleSchema });
export const deleteDocumentSchema = z.object({ id: documentIdSchema });
export const sharePermissionSchema = z.enum(["viewer", "editor"]);
export const normalizedEmailSchema = z.string().trim().toLowerCase()
  .pipe(z.email("Enter a valid email address."));
export const shareDocumentSchema = z.object({
  documentId: documentIdSchema,
  email: normalizedEmailSchema,
  permission: sharePermissionSchema,
});
export const updateSharePermissionSchema = z.object({
  shareId: shareIdSchema,
  permission: sharePermissionSchema,
});
export const documentContentSchema = z.object({
  documentId: documentIdSchema,
  content: z.object({ type: z.literal("doc") }).passthrough(),
});
