import clsx from "clsx";
import { Highlight, type PrismTheme } from "prism-react-renderer";

const codeTheme: PrismTheme = {
  plain: {
    color: "#c9c9d3",
    backgroundColor: "transparent",
  },
  styles: [
    {
      types: ["comment", "prolog", "doctype", "cdata"],
      style: { color: "#5f5f6b", fontStyle: "italic" },
    },
    {
      types: ["punctuation"],
      style: { color: "#8a8a96" },
    },
    {
      types: ["tag", "keyword", "selector"],
      style: { color: "#a99fff" },
    },
    {
      types: ["attr-name", "property", "builtin"],
      style: { color: "#7dd3fc" },
    },
    {
      types: ["string", "attr-value", "char", "regex"],
      style: { color: "#a7e3a1" },
    },
    {
      types: ["number", "boolean", "constant", "symbol"],
      style: { color: "#f0b67f" },
    },
    {
      types: ["function", "class-name"],
      style: { color: "#f2d06b" },
    },
    {
      types: ["operator", "entity", "url"],
      style: { color: "#c9c9d3" },
    },
    {
      types: ["variable", "parameter"],
      style: { color: "#e6e6eb" },
    },
    {
      types: ["deleted"],
      style: { color: "#ff6b6b" },
    },
    {
      types: ["inserted"],
      style: { color: "#a7e3a1" },
    },
  ],
};

interface CodeBlockProps {
  code: string;
  language: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const trimmed = code.trim();

  if (!trimmed) {
    return (
      <div className="flex min-h-48 items-center justify-center p-8 text-[12px] text-fg-subtle">
        Nothing to show yet.
      </div>
    );
  }

  return (
    <Highlight theme={codeTheme} code={trimmed} language={language}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre className="w-full min-w-0 py-4 font-mono text-[12.5px] leading-6 sm:text-[13px]">
          {tokens.map((line, index) => {
            const lineProps = getLineProps({ line });

            return (
              <div
                key={index}
                {...lineProps}
                className={clsx(
                  "flex px-4 transition-colors hover:bg-white/[0.02]",
                  lineProps.className,
                )}
              >
                <span className="w-10 shrink-0 select-none pr-4 text-right text-[10.5px] leading-6 tabular-nums text-white/25">
                  {index + 1}
                </span>
                <span className="min-w-0 pr-6 whitespace-pre-wrap break-words">
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </span>
              </div>
            );
          })}
        </pre>
      )}
    </Highlight>
  );
}
