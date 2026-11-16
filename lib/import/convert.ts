import { generateJSON } from "@tiptap/html/server";
import type { JSONContent } from "@tiptap/core";
import { marked, type Tokens } from "marked";
import { createTiptapExtensions } from "../tiptap-extensions";

const importContentLimit = 1_000_000;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function convertTxtToTiptapJson(source: string): JSONContent {
  const normalized = source.replace(/\r\n?/g, "\n").trim();
  if (!normalized) throw new Error("The selected file contains only whitespace.");
  const paragraphs = normalized
    .split(/\n[\t ]*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return {
    type: "doc",
    content: paragraphs.map((paragraph) => ({
      type: "paragraph",
      content: paragraph.split("\n").flatMap((line, index) => [
        ...(index > 0 ? [{ type: "hardBreak" }] : []),
        ...(line ? [{ type: "text", text: line }] : []),
      ]),
    })),
  };
}

export async function convertMarkdownToTiptapJson(source: string): Promise<JSONContent> {
  if (!source.trim()) throw new Error("The selected file contains only whitespace.");
  const renderer = new marked.Renderer();

  // Markdown raw HTML is untrusted. Drop every raw HTML token before DOM parsing so scripts,
  // event handlers, and other HTML cannot become stored editor text or markup.
  renderer.html = () => "";
  renderer.image = ({ text, href }: Tokens.Image) => escapeHtml(text || href);
  renderer.code = ({ text }: Tokens.Code) => `<p>${escapeHtml(text)}</p>`;
  renderer.codespan = ({ text }: Tokens.Codespan) => escapeHtml(text);
  renderer.table = (table: Tokens.Table) => {
    const rows = [table.header, ...table.rows];
    return rows
      .map((row) => `<p>${escapeHtml(row.map((cell) => cell.text).join(" | "))}</p>`)
      .join("\n");
  };

  const html = marked.parse(source, { renderer, async: false });
  const json = await generateJSON(html, createTiptapExtensions());
  return json as JSONContent;
}

function textContent(node: JSONContent): string {
  return `${node.text ?? ""}${node.content?.map(textContent).join("") ?? ""}`;
}

function cleanTitle(value: string): string {
  let title = "";
  for (const character of value.trim()) {
    if (title.length + character.length > 200) break;
    title += character;
  }
  return title.trim();
}

export async function convertImportToDocument(
  source: string,
  filename: string,
  extension: "txt" | "md",
): Promise<{ title: string; content: JSONContent }> {
  const content = extension === "md"
    ? await convertMarkdownToTiptapJson(source)
    : convertTxtToTiptapJson(source);

  const firstH1 = extension === "md"
    ? content.content?.find((node) => node.type === "heading" && node.attrs?.level === 1)
    : undefined;
  const markdownTitle = firstH1 ? textContent(firstH1) : "";
  const filenameTitle = filename.replace(/\.[^.]+$/, "");
  const title = cleanTitle(markdownTitle || filenameTitle) || "Imported document";

  const serialized = JSON.stringify(content);
  if (new TextEncoder().encode(serialized).byteLength > importContentLimit) {
    throw new Error("Converted document exceeds the 1 MB content limit.");
  }

  return { title, content };
}
