import StarterKit from "@tiptap/starter-kit";
import type { Extensions } from "@tiptap/core";

export function createTiptapExtensions(): Extensions {
  return [StarterKit.configure({
    blockquote: false,
    code: false,
    codeBlock: false,
    heading: { levels: [1, 2, 3] },
    horizontalRule: false,
    link: false,
    strike: false,
  })];
}
