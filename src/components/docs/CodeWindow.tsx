import { useState } from "react";
import { Check, Copy, FileCode2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeWindowProps {
  title?: string;
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeWindow({ title, code, language = "bash", showLineNumbers = false, className }: CodeWindowProps) {
  const [copied, setCopied] = useState(false);
  const lines = code.trim().split("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={cn("docs-code-window group overflow-hidden rounded-[16px] border border-[#2f5e50] bg-[#183a30] shadow-[0_14px_32px_rgba(24,58,48,.15)]", className)}>
      <div className="flex min-h-12 items-center justify-between gap-4 border-b border-[#2f5e50] bg-[#123128] px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <FileCode2 size={15} className="shrink-0 text-[#76d4b5]" aria-hidden="true" />
          <span className="truncate font-mono text-[10px] text-[#c6c6bf]">{title || "Code sample"}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-[6px] border border-[#ffffff1a] px-2 py-1 font-mono text-[8px] font-semibold uppercase tracking-[.1em] text-[#b8cec4]">{language}</span>
          <button
            type="button"
            onClick={handleCopy}
            title="Copy code to clipboard"
            aria-label={copied ? "Code copied" : "Copy code"}
            className="inline-flex h-8 items-center gap-1.5 rounded-[7px] border border-[#ffffff1a] px-2.5 text-[10px] font-semibold text-[#d7e2dc] transition hover:border-[#76d4b5] hover:text-[#f5f3ee] focus:outline-none focus:ring-2 focus:ring-[#76d4b566]"
          >
            {copied ? <Check size={13} className="text-[#76d4b5]" /> : <Copy size={13} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto p-4 font-mono text-[12px] leading-6 sm:p-5 sm:text-[13px] custom-scrollbar">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, index) => (
              <tr key={`${index}-${line}`}>
                {showLineNumbers && (
                  <td className="w-[1%] select-none whitespace-nowrap pr-5 text-right align-top text-[#686b65]">{index + 1}</td>
                )}
                <td className="whitespace-pre align-top text-[#deddd7]">
                  <span dangerouslySetInnerHTML={{ __html: colorize(line, language) }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span className="sr-only" aria-live="polite">{copied ? "Code copied to clipboard" : ""}</span>
    </div>
  );
}

const colorize = (code: string, language: string) => {
  if (language === "bash" || language === "shell") {
    return escapeHtml(code).replace(/^\$ /g, '<span class="text-[#76d4b5]">$ </span>');
  }

  const tokenDefinitions = [
    { regex: /\/\/.*/g, className: "text-[#858982]" },
    { regex: /"[^"]*"(?=\s*:)/g, className: "text-[#a8d7c5]" },
    { regex: /"[^"]*"/g, className: "text-[#76d4b5]" },
    { regex: /\b(import|export|const|let|var|function|return|if|else|async|await|from|new)\b/g, className: "text-[#f1efe9]" },
    { regex: /\b(true|false|null|undefined)\b/g, className: "text-[#b9d9cc]" },
    { regex: /\b\d+(\.\d+)?\b/g, className: "text-[#d7d4c9]" },
  ];

  type Match = { start: number; end: number; content: string; className: string };
  const matches: Match[] = [];

  tokenDefinitions.forEach((definition) => {
    definition.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = definition.regex.exec(code)) !== null) {
      matches.push({ start: match.index, end: match.index + match[0].length, content: match[0], className: definition.className });
    }
  });

  matches.sort((first, second) => first.start - second.start || second.end - second.start - (first.end - first.start));
  const finalMatches: Match[] = [];
  let occupiedUntil = 0;

  matches.forEach((match) => {
    if (match.start >= occupiedUntil) {
      finalMatches.push(match);
      occupiedUntil = match.end;
    }
  });

  let cursor = 0;
  let result = "";
  finalMatches.forEach((match) => {
    result += escapeHtml(code.substring(cursor, match.start));
    result += `<span class="${match.className}">${escapeHtml(match.content)}</span>`;
    cursor = match.end;
  });

  return result + escapeHtml(code.substring(cursor));
};

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
