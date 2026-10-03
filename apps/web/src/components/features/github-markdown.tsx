"use client";

import type { ReactNode } from "react";

/**
 * A small, dependency-free Markdown renderer for issue bodies, READMEs and
 * model answers.
 *
 * Two things it now handles that it previously did not, both of which showed
 * up as raw text on screen:
 *
 *  - GitHub-flavoured tables. Answers routinely come back as a table ("what to
 *    inspect / where / why"), and without a parser the pipes and the
 *    |---|---| rule were printed literally, one row per line.
 *  - Soft-wrapped paragraphs. Every source line used to become its own <p>,
 *    so a single wrapped sentence rendered as several spaced blocks. Adjacent
 *    lines are now joined into one paragraph, which removes the stray gaps.
 */
export function GitHubMarkdown({ markdown, emptyFallback }: { markdown: string; emptyFallback?: string }) {
  const source = markdown.trim() || emptyFallback || "";
  if (!source) return null;

  const lines = normalizeGitHubMarkup(source).replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let list: Array<{ text: string; ordered: boolean }> = [];
  let paragraph: string[] = [];

  const flushList = () => {
    if (!list.length) return;
    const ordered = list[0].ordered;
    const Tag = ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={`list-${blocks.length}`} className={`${ordered ? "list-decimal" : "list-disc"} my-3 space-y-1.5 pl-5 leading-6`}>
        {list.map((item, index) => <li key={`${index}-${item.text}`} className="pl-1">{renderInline(item.text)}</li>)}
      </Tag>,
    );
    list = [];
  };

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = paragraph.join(" ");
    paragraph = [];
    blocks.push(<p key={`p-${blocks.length}`} className="my-2.5">{renderInline(text)}</p>);
  };

  const flushAll = () => { flushList(); flushParagraph(); };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    /* fenced code ---------------------------------------------------- */
    if (/^```/.test(trimmed)) {
      flushAll();
      const language = trimmed.replace(/^```/, "").trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index].trim())) {
        code.push(lines[index]);
        index += 1;
      }
      blocks.push(
        <pre key={`code-${blocks.length}`} className="my-4 overflow-x-auto rounded-lg border border-border bg-background p-4 text-xs leading-5 text-foreground">
          {language ? <span className="mb-2 block text-[10px] uppercase tracking-wide text-subtle-foreground">{language}</span> : null}
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    /* tables ----------------------------------------------------------
       Model output is not always tidy: sometimes there is no |---| rule,
       sometimes there is a blank line between rows. Both used to fall through
       to the paragraph branch and print the pipes literally, so the detection
       is deliberately forgiving - any run of pipe rows counts as a table. */
    if (looksLikeTableRow(trimmed) && (isTableDivider(lines[index + 1]) || looksLikeTableRow(nextContentLine(lines, index + 1)))) {
      flushAll();
      const collected: string[][] = [];
      let cursor = index;
      let blanks = 0;
      while (cursor < lines.length) {
        const candidate = lines[cursor].trim();
        if (!candidate) {
          // Tolerate a single blank line inside the table, but stop if the
          // next content is not another row.
          if (blanks >= 1 || !looksLikeTableRow(nextContentLine(lines, cursor + 1))) break;
          blanks += 1;
          cursor += 1;
          continue;
        }
        if (isTableDivider(candidate)) { cursor += 1; continue; }
        if (!looksLikeTableRow(candidate)) break;
        blanks = 0;
        collected.push(splitRow(candidate));
        cursor += 1;
      }
      index = cursor - 1;
      if (collected.length > 0) {
        const [header, ...rows] = collected;
        blocks.push(<MarkdownTable key={`table-${blocks.length}`} header={header} rows={rows} />);
        continue;
      }
    }

    /* block image ------------------------------------------------------ */
    const imageLine = trimmed.match(/^!\[([^\]]*)\]\((\S+?)(?:\s+["'][^"']*["'])?\)$/);
    if (imageLine) {
      flushAll();
      blocks.push(<MarkdownImage key={`image-${blocks.length}`} alt={imageLine[1]} src={imageLine[2]} />);
      continue;
    }

    /* lists ------------------------------------------------------------ */
    const unordered = line.match(/^\s*[-*+]\s+(.*)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (unordered || ordered) {
      flushParagraph();
      list.push({ text: (unordered?.[1] ?? ordered?.[1] ?? "").trim(), ordered: Boolean(ordered) });
      continue;
    }

    /* blank line ------------------------------------------------------- */
    if (!trimmed) { flushAll(); continue; }

    flushList();

    /* rules, headings, quotes ------------------------------------------ */
    if (/^(---+|___+|\*\*\*+)$/.test(trimmed)) {
      flushParagraph();
      blocks.push(<hr key={`rule-${blocks.length}`} className="my-5 border-border" />);
      continue;
    }
    const heading = line.match(/^\s*(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      blocks.push(<MarkdownHeading key={`heading-${blocks.length}`} level={Math.min(heading[1].length, 4)} text={heading[2]} />);
      continue;
    }
    if (/^>\s?/.test(trimmed)) {
      flushParagraph();
      blocks.push(
        <blockquote key={`quote-${blocks.length}`} className="my-3 border-l-2 border-primary/60 pl-4 text-muted-foreground">
          {renderInline(trimmed.replace(/^>\s?/, ""))}
        </blockquote>,
      );
      continue;
    }

    paragraph.push(trimmed);
  }

  flushAll();
  return <div className="max-w-4xl text-sm leading-6 text-muted-foreground">{blocks}</div>;
}

/* ----------------------------------------------------------------- table */

/** A pipe row: at least two cells, so a sentence containing one "|" is not a table. */
function looksLikeTableRow(line: string | undefined): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return false;
  return (trimmed.match(/\|/g) ?? []).length >= 2;
}

/** The next line that is not blank, used to look one row ahead. */
function nextContentLine(lines: string[], from: number): string | undefined {
  for (let index = from; index < lines.length && index < from + 3; index += 1) {
    if (lines[index].trim()) return lines[index];
  }
  return undefined;
}

function isTableDivider(line: string | undefined): boolean {
  if (!line) return false;
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);
}

/**
 * Splits a row on unescaped pipes, dropping the optional leading/trailing one.
 * Written as a walk rather than a lookbehind regex, which this build target
 * does not allow.
 */
function splitRow(row: string): string[] {
  const body = row.replace(/^\s*\|/, "").replace(/\|\s*$/, "");
  const cells: string[] = [];
  let current = "";
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (character === "\\" && body[index + 1] === "|") { current += "|"; index += 1; continue; }
    if (character === "|") { cells.push(current.trim()); current = ""; continue; }
    current += character;
  }
  cells.push(current.trim());
  return cells;
}

function MarkdownTable({ header, rows }: { header: string[]; rows: string[][] }) {
  const columns = header.length;
  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted/50">
            {header.map((cell, index) => (
              <th key={index} scope="col" className="border-b border-border px-3 py-2 text-left align-top text-xs font-semibold uppercase tracking-wide text-foreground">
                {renderInline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border/60 last:border-b-0 even:bg-muted/20">
              {Array.from({ length: columns }, (_, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 align-top leading-6 text-muted-foreground">
                  {renderInline(row[cellIndex] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------------------------------------------- inline */

function renderInline(value: string): ReactNode {
  const parts = value.split(/(!\[[^\]]*\]\([^)]*\)|\[[^\]]+\]\([^)]*\)|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|<https?:\/\/[^>]+>)/g);
  return parts.map((part, index) => {
    const image = part.match(/^!\[([^\]]*)\]\((\S+?)(?:\s+["'][^"']*["'])?\)$/);
    if (image) return <MarkdownImage key={index} alt={image[1]} src={image[2]} inline />;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={index} className="rounded bg-background px-1.5 py-0.5 text-xs text-foreground">{part.slice(1, -1)}</code>;
    }
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      return <strong key={index} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link && isSafeUrl(link[2])) {
      return <a key={index} href={link[2]} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">{link[1]}</a>;
    }
    const autolink = part.match(/^<(https?:\/\/[^>]+)>$/);
    if (autolink) {
      return <a key={index} href={autolink[1]} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">{autolink[1]}</a>;
    }
    return part;
  });
}

function MarkdownImage({ alt, src, inline = false }: { alt: string; src: string; inline?: boolean }) {
  if (!isSafeUrl(src)) return <span className="text-muted-foreground">{alt || "Attached image"}</span>;
  return (
    <span className={inline ? "mx-1 inline-flex align-middle" : "my-4 block"}>
      <img
        src={src}
        alt={alt || "Issue attachment"}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={inline ? "max-h-10 max-w-24 rounded border border-border object-contain" : "max-h-[540px] max-w-full rounded-lg border border-border bg-background object-contain"}
      />
    </span>
  );
}

function MarkdownHeading({ level, text }: { level: number; text: string }) {
  const content = renderInline(text);
  // Distinct sizing per level so a response's structure (section > sub-point)
  // is visible at a glance instead of every heading looking like plain bold
  // text.
  if (level === 1) return <h1 className="mt-6 text-base font-semibold text-foreground first:mt-0">{content}</h1>;
  if (level === 2) return <h2 className="mt-6 border-t border-border/60 pt-4 text-sm font-semibold uppercase tracking-wide text-primary first:mt-0 first:border-t-0 first:pt-0">{content}</h2>;
  if (level === 3) return <h3 className="mt-4 text-sm font-semibold text-foreground first:mt-0">{content}</h3>;
  return <h4 className="mt-3 text-sm font-medium text-foreground first:mt-0">{content}</h4>;
}

function normalizeGitHubMarkup(value: string) {
  return value
    .replace(/<details[^>]*>/gi, "")
    .replace(/<\/details>/gi, "")
    .replace(/<summary[^>]*>([\s\S]*?)<\/summary>/gi, "**$1**")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi, (_, src: string) => `![Attached screenshot](${src})`)
    .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, text: string) => `[${stripTags(text).trim() || href}](${href})`)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripTags(value: string) { return value.replace(/<[^>]+>/g, ""); }
function isSafeUrl(value: string) { return /^https?:\/\//i.test(value); }
