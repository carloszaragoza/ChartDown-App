import type { ReactNode } from "react";

// The small part of Markdown the legal texts use (T-1202): "#" and "##" headings, paragraphs,
// "-" lists, **bold** and _italics_. Anything else is shown as plain text, never as HTML.

export type Block = { type: "h1" | "h2" | "p"; text: string } | { type: "ul"; items: string[] };

/** The text's blocks, in order. */
export function blocks(markdown: string): Block[] {
  const result: Block[] = [];
  for (const chunk of markdown.replace(/\r\n/g, "\n").split(/\n{2,}/)) {
    const lines = chunk.split("\n").filter((line) => line.trim() !== "");
    const first = lines[0];
    if (first === undefined) continue;
    if (first.startsWith("## ")) result.push({ type: "h2", text: first.slice(3).trim() });
    else if (first.startsWith("# ")) result.push({ type: "h1", text: first.slice(2).trim() });
    else if (lines.every((line) => line.startsWith("- ")))
      result.push({ type: "ul", items: lines.map((line) => line.slice(2).trim()) });
    else result.push({ type: "p", text: lines.join(" ").trim() });
  }
  return result;
}

/** A line's **bold** and _italic_ parts. */
export function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2)
      return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  });
}

/** A legal text, as headings, paragraphs and lists. */
export function Markdown({ text, className }: { text: string; className?: string | undefined }) {
  return (
    <div className={className}>
      {blocks(text).map((block, index) => {
        if (block.type === "ul")
          return (
            <ul key={index}>
              {block.items.map((item, i) => (
                <li key={i}>{inline(item)}</li>
              ))}
            </ul>
          );
        const Tag = block.type;
        return <Tag key={index}>{inline(block.text)}</Tag>;
      })}
    </div>
  );
}
