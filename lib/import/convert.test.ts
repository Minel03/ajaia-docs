import { describe, expect, it } from "vitest";
import { convertImportToDocument } from "./convert";

describe("convertImportToDocument", () => {
  it("converts TXT paragraphs, hard breaks, CRLF, and filename titles", async () => {
    const result = await convertImportToDocument("First line\r\nsecond line\r\n\r\nThird", " notes.TXT", "txt");

    expect(result.title).toBe("notes");
    expect(result.content.content).toEqual([
      { type: "paragraph", content: [
        { type: "text", text: "First line" },
        { type: "hardBreak" },
        { type: "text", text: "second line" },
      ] },
      { type: "paragraph", content: [{ type: "text", text: "Third" }] },
    ]);
  });

  it("converts markdown headings, marks, nested lists, and uses the first H1 as title", async () => {
    const result = await convertImportToDocument(
      "# A heading\n\n**bold** and *italic*\n\n- parent\n  - child",
      "fallback.md",
      "md",
    );
    const serialized = JSON.stringify(result.content);

    expect(result.title).toBe("A heading");
    expect(result.content.content?.map((node) => node.type)).toEqual(["heading", "paragraph", "bulletList"]);
    expect(serialized).toContain('"type":"bold"');
    expect(serialized).toContain('"type":"italic"');
    expect(serialized).toContain('"type":"bulletList"');
    expect(serialized).toContain('"type":"listItem"');
  });

  it("uses the filename when markdown has no H1", async () => {
    const result = await convertImportToDocument("## Secondary heading", " Notes.MD", "md");
    expect(result.title).toBe("Notes");
  });

  it("drops raw HTML and dangerous attributes from markdown JSON", async () => {
    const result = await convertImportToDocument(
      '<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">',
      "unsafe.md",
      "md",
    );
    const serialized = JSON.stringify(result.content).toLowerCase();

    expect(serialized).not.toContain("script");
    expect(serialized).not.toContain("onerror");
    expect(serialized).not.toContain("<img");
  });

  it("degrades tables and code blocks to text", async () => {
    const result = await convertImportToDocument(
      "| A | B |\n|---|---|\n| one | two |\n\n```js\nconst value = 1;\n```",
      "plain.md",
      "md",
    );
    const serialized = JSON.stringify(result.content);

    expect(serialized).toContain("A | B");
    expect(serialized).toContain("const value = 1;");
    expect(serialized).not.toContain('"type":"table"');
    expect(serialized).not.toContain('"type":"codeBlock"');
  });

  it.each([
    ["empty TXT", "", "txt"],
    ["whitespace TXT", " \r\n\t ", "txt"],
    ["empty Markdown", "", "md"],
    ["whitespace Markdown", " \r\n\t ", "md"],
  ] as const)("rejects %s input", async (_label, source, extension) => {
    await expect(convertImportToDocument(source, "empty.file", extension)).rejects.toThrow(/whitespace/);
  });

  it("rejects converted content over the 1 MB limit", async () => {
    await expect(convertImportToDocument("x".repeat(1_000_001), "large.txt", "txt"))
      .rejects.toThrow(/1 MB/);
  });
});
