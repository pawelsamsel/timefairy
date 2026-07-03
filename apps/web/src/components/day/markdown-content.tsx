import { cn } from "@/lib/utils";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMarkdown(value: string): string {
  return value
    .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-[0.85em]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline" target="_blank" rel="noreferrer">$1</a>');
}

function blockMarkdown(source: string): string {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      continue;
    }

    if (/^#{1,3}\s+/.test(trimmed)) {
      closeList();
      const level = trimmed.match(/^#+/)![0].length;
      const text = trimmed.replace(/^#{1,3}\s+/, "");
      const tag = level === 1 ? "h2" : level === 2 ? "h3" : "h4";
      html.push(`<${tag} class="font-semibold ${level === 1 ? "text-base" : "text-sm"} mt-2 mb-1">${inlineMarkdown(escapeHtml(text))}</${tag}>`);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      if (!inList) {
        html.push('<ul class="list-disc space-y-0.5 pl-4">');
        inList = true;
      }
      const text = trimmed.replace(/^[-*]\s+/, "");
      html.push(`<li>${inlineMarkdown(escapeHtml(text))}</li>`);
      continue;
    }

    closeList();
    html.push(`<p class="whitespace-pre-wrap">${inlineMarkdown(escapeHtml(line))}</p>`);
  }

  closeList();
  return html.join("");
}

type MarkdownContentProps = {
  source: string;
  className?: string;
  emptyLabel?: string;
};

export function MarkdownContent({ source, className, emptyLabel = "No note" }: MarkdownContentProps) {
  if (!source.trim()) {
    return <p className={cn("text-sm italic text-muted-foreground", className)}>{emptyLabel}</p>;
  }

  return (
    <div
      className={cn("space-y-1 text-sm leading-relaxed text-foreground", className)}
      dangerouslySetInnerHTML={{ __html: blockMarkdown(source) }}
    />
  );
}
