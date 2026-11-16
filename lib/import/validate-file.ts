import { z } from "zod";

export const importFileSchema = z.file();
export const maxImportFileBytes = 500 * 1024;

const extensionSchema = z.enum(["txt", "md"]);

export function validateImportFileMetadata(filename: string, size: number): {
  success: true;
  extension: "txt" | "md";
} | {
  success: false;
  error: string;
} {
  const extension = /\.([^.]+)$/.exec(filename)?.[1]?.toLowerCase();
  const parsedExtension = extensionSchema.safeParse(extension);
  if (!parsedExtension.success) {
    return { success: false, error: "Unsupported file type. Choose a .txt or .md file." };
  }
  if (size > maxImportFileBytes) {
    return { success: false, error: "File is too large. The maximum size is 500 KB." };
  }
  if (size === 0) return { success: false, error: "The selected file is empty." };

  return { success: true, extension: parsedExtension.data };
}

export function decodeImportFileBytes(bytes: Uint8Array): {
  success: true;
  text: string;
} | {
  success: false;
  error: string;
} {
  if (bytes.length === 0) return { success: false, error: "The selected file is empty." };
  if (bytes.includes(0)) {
    return { success: false, error: "The file contains null bytes and cannot be imported as text." };
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { success: false, error: "The file is not valid UTF-8 text." };
  }
  if (text.startsWith("\uFEFF")) text = text.slice(1);
  if (!text.trim()) return { success: false, error: "The selected file contains only whitespace." };

  return { success: true, text };
}
