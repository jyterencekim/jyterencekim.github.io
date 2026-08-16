import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

const parser = new MarkdownIt();

const EXCERPT_LENGTH = 160;

// posts without a frontmatter description fall back to their own opening words
export default function toExcerpt(
  body: string,
  maxLength: number = EXCERPT_LENGTH
): string {
  const text = sanitizeHtml(parser.render(body), {
    allowedTags: [],
    allowedAttributes: {},
  })
    // c0 controls are illegal in xml 1.0 and unescapable - drop them
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const chars = Array.from(text);
  if (chars.length <= maxLength) return text;
  return chars.slice(0, maxLength).join("").trimEnd() + "…";
}
