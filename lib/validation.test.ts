import { describe, expect, it } from "vitest";
import {
  documentContentSchema,
  normalizedEmailSchema,
  sharePermissionSchema,
  titleSchema,
} from "./validation";
import { decodeImportFileBytes, validateImportFileMetadata } from "./import/validate-file";

describe("pure validation schemas", () => {
  it("trims titles and enforces 1 to 200 characters", () => {
    expect(titleSchema.parse("  Title  ")).toBe("Title");
    expect(titleSchema.parse("x".repeat(200))).toHaveLength(200);
    expect(titleSchema.safeParse("  ").success).toBe(false);
    expect(titleSchema.safeParse("x".repeat(201)).success).toBe(false);
  });

  it("accepts only viewer/editor share permissions", () => {
    expect(sharePermissionSchema.parse("viewer")).toBe("viewer");
    expect(sharePermissionSchema.parse("editor")).toBe("editor");
    expect(sharePermissionSchema.safeParse("owner").success).toBe(false);
  });

  it("normalizes email by trimming and lowercasing", () => {
    expect(normalizedEmailSchema.parse("  ALICE@EXAMPLE.COM ")).toBe("alice@example.com");
    expect(normalizedEmailSchema.safeParse("not-an-email").success).toBe(false);
  });

  it("requires document content to be an object with type doc", () => {
    expect(documentContentSchema.safeParse({
      documentId: "cb5f76bc-6ab7-4e36-bff8-d126b885cb68",
      content: { type: "doc", content: [] },
    }).success).toBe(true);
    expect(documentContentSchema.safeParse({
      documentId: "cb5f76bc-6ab7-4e36-bff8-d126b885cb68",
      content: { type: "paragraph" },
    }).success).toBe(false);
  });
});

describe("import file validation", () => {
  it("allows .txt/.md case-insensitively up to 500 KB", () => {
    expect(validateImportFileMetadata("notes.TXT", 1)).toEqual({ success: true, extension: "txt" });
    expect(validateImportFileMetadata("notes.Md", 1)).toEqual({ success: true, extension: "md" });
    expect(validateImportFileMetadata("notes.txt", 500 * 1024).success).toBe(true);
  });

  it("rejects unsupported extensions and files over 500 KB", () => {
    expect(validateImportFileMetadata("notes.pdf", 1).success).toBe(false);
    expect(validateImportFileMetadata("notes.md", 500 * 1024 + 1).success).toBe(false);
  });

  it("strips a UTF-8 BOM and rejects null bytes, invalid UTF-8, and whitespace", () => {
    expect(decodeImportFileBytes(new TextEncoder().encode("\uFEFFhello")))
      .toEqual({ success: true, text: "hello" });
    expect(decodeImportFileBytes(new Uint8Array([65, 0, 66])).success).toBe(false);
    expect(decodeImportFileBytes(new Uint8Array([0xc3, 0x28])).success).toBe(false);
    expect(decodeImportFileBytes(new TextEncoder().encode(" \r\n ")).success).toBe(false);
  });
});
