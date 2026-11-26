import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
  if (!content) return null;

  return (
    <div className={`prose-custom max-w-none space-y-2.5 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg sm:text-xl font-bold font-sans text-foreground mt-4 mb-2 pb-1 border-b border-border/40">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base sm:text-lg font-bold font-sans text-foreground mt-4 mb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm sm:text-base font-semibold font-sans text-foreground mt-3 mb-1.5">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs sm:text-sm font-semibold font-sans text-muted-foreground uppercase tracking-wider mt-2.5 mb-1">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-sm sm:text-[15px] leading-[1.68] font-serif text-foreground/90 my-2">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-5 my-2 space-y-1.5 text-sm sm:text-[15px] font-serif text-foreground/90">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-5 my-2 space-y-1.5 text-sm sm:text-[15px] font-serif text-foreground/90">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-[1.65] pl-1">
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground font-sans">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-foreground/90">
              {children}
            </em>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !props.node?.position || !codeClassName;
            if (isInline) {
              return (
                <code className="font-mono text-xs bg-muted/80 text-secondary px-1.5 py-0.5 rounded border border-border/50">
                  {children}
                </code>
              );
            }
            return (
              <code className="font-mono text-xs block text-foreground">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-muted/40 border border-border rounded-lg p-3 my-3 overflow-x-auto font-mono text-xs text-foreground shadow-inner">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-xs sm:text-sm font-sans">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50 border-b border-border text-foreground font-semibold">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="border border-border/60 px-3.5 py-2 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border/60 px-3.5 py-2 text-muted-foreground align-top">
              {children}
            </td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-secondary/70 bg-muted/20 pl-3.5 py-1.5 my-2 text-sm italic text-foreground/85 rounded-r">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-3 border-border/40" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
