import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import clsx from "clsx";
import toast, { Toaster } from "react-hot-toast";
import { AnimatePresence, motion } from "motion/react";
import { posthog } from "posthog-js";
import {
  convertToReactComponent,
  formatSvg,
  type FileType,
} from "@xiping/svg-to-react";
import { CodeBlock } from "./CodeBlock";
import { SvgPreview } from "./SvgPreview";
import { samples, type SvgSample } from "./samples";
import {
  fileNameToComponentName,
  formatBytes,
  normalizeComponentName,
  prepareSvg,
  prettyPrintSvg,
  type PreparedSvg,
} from "./svg";
import {
  CheckIcon,
  ClipboardIcon,
  CodeIcon,
  CopyIcon,
  FileCodeIcon,
  GithubIcon,
  GridIcon,
  ImageIcon,
  LockIcon,
  LogoMark,
  MinusIcon,
  PlusIcon,
  SparklesIcon,
  UploadIcon,
  XIcon,
} from "./icons";

const MIN_SIZE = 16;
const MAX_SIZE = 512;
const DEFAULT_SIZE = 120;
const MAX_FILE_SIZE = 2 * 1024 * 1024;

type View = "component" | "source";

const TABS: { id: View; label: string }[] = [
  { id: "component", label: "Component" },
  { id: "source", label: "SVG source" },
];

const FEATURES = [
  {
    icon: CodeIcon,
    title: "Typed output",
    body: "TSX or JSX, ready to drop into your app.",
  },
  {
    icon: SparklesIcon,
    title: "SVGO clean",
    body: "Paths optimized, attributes normalized.",
  },
  {
    icon: LockIcon,
    title: "Private by default",
    body: "Conversion runs locally, not on a server.",
  },
] as const;

function clampSize(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_SIZE;
  }

  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(value)));
}

export default function SvgConverter() {
  const [svgContent, setSvgContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [componentName, setComponentName] = useState("SvgComponent");
  const [fileType, setFileType] = useState<FileType>("tsx");
  const [tint, setTint] = useState<string | null>(null);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [showGrid, setShowGrid] = useState(true);
  const [view, setView] = useState<View>("component");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyTimer = useRef<number | null>(null);

  const copyKey = `${view}:${fileType}`;
  const copied = copiedKey === copyKey;

  const safeComponentName = useMemo(
    () => normalizeComponentName(componentName),
    [componentName],
  );

  const preview = useMemo(() => {
    if (!svgContent) {
      return null;
    }

    try {
      return prepareSvg(svgContent, size, tint);
    } catch {
      return null;
    }
  }, [size, svgContent, tint]);

  const reactCode = useMemo(() => {
    if (!svgContent) {
      return "";
    }

    try {
      return convertToReactComponent(svgContent, safeComponentName, fileType);
    } catch {
      return "";
    }
  }, [fileType, safeComponentName, svgContent]);

  const sourceCode = useMemo(
    () => (svgContent ? prettyPrintSvg(svgContent) : ""),
    [svgContent],
  );
  const activeCode = view === "component" ? reactCode : sourceCode;
  const lineCount = useMemo(
    () => (activeCode ? activeCode.trim().split("\n").length : 0),
    [activeCode],
  );

  const loadSvg = useCallback(
    (content: string, name: string, bytes: number) => {
      const formatted = formatSvg(content);
      prepareSvg(formatted, DEFAULT_SIZE, null);

      setSvgContent(formatted);
      setFileName(name);
      setFileSize(bytes);
      setComponentName(fileNameToComponentName(name));
      setTint(null);
      setView("component");
      setSize(DEFAULT_SIZE);
      setCopiedKey(null);
    },
    [],
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];

      if (!file) {
        return;
      }

      try {
        const text = await file.text();
        loadSvg(text, file.name, file.size);
        posthog.capture("drop svg file", { size: file.size });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not read that SVG.",
        );
      }
    },
    [loadSvg],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDropRejected: (rejections) => {
      const firstError = rejections[0]?.errors[0];

      if (firstError?.code === "file-too-large") {
        toast.error("Keep SVGs under 2 MB.");
      } else {
        toast.error("Only .svg files are supported.");
      }
    },
    accept: {
      "image/svg+xml": [".svg"],
    },
    multiple: false,
    noClick: true,
    noKeyboard: true,
    maxSize: MAX_FILE_SIZE,
  });

  const loadPastedText = useCallback(
    (text: string) => {
      if (!/<svg[\s>]/i.test(text)) {
        return false;
      }

      loadSvg(text, "pasted.svg", new TextEncoder().encode(text).length);
      posthog.capture("paste svg");
      return true;
    },
    [loadSvg],
  );

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("input, textarea, [contenteditable='true']")
      ) {
        return;
      }

      const text = event.clipboardData?.getData("text/plain") ?? "";

      if (!/<svg[\s>]/i.test(text)) {
        return;
      }

      event.preventDefault();

      try {
        loadPastedText(text);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "That text isn't a valid SVG.",
        );
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [loadPastedText]);

  useEffect(
    () => () => {
      if (copyTimer.current) {
        window.clearTimeout(copyTimer.current);
      }
    },
    [],
  );

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();

      if (!loadPastedText(text)) {
        toast.error("Your clipboard doesn't contain an SVG.");
      }
    } catch {
      toast.error("Clipboard access was blocked.");
    }
  };

  const copyToClipboard = async () => {
    const code = activeCode.trim();

    if (!code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setCopiedKey(copyKey);
      posthog.capture("copy code", {
        type: view === "component" ? fileType : "svg",
      });

      if (copyTimer.current) {
        window.clearTimeout(copyTimer.current);
      }

      copyTimer.current = window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      toast.error("Couldn't copy to the clipboard.");
    }
  };

  const reset = () => {
    setSvgContent("");
    setFileName("");
    setFileSize(0);
    setComponentName("SvgComponent");
    setTint(null);
    setView("component");
    setSize(DEFAULT_SIZE);
    setShowGrid(true);
    setCopiedKey(null);
  };

  const handleSample = (sample: SvgSample) => {
    try {
      loadSvg(
        sample.svg,
        sample.fileName,
        new TextEncoder().encode(sample.svg).length,
      );
      posthog.capture("load sample", { name: sample.id });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load that sample.",
      );
    }
  };

  return (
    <div
      {...getRootProps({ tabIndex: -1 })}
      className="relative flex min-h-screen flex-col bg-ink-950 text-fg lg:h-screen lg:overflow-hidden"
    >
      <input {...getInputProps()} />

      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3200,
          style: {
            background: "#15151a",
            color: "#f2f2f5",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            boxShadow: "0 18px 48px -16px rgba(0,0,0,0.85)",
            fontSize: "12.5px",
            padding: "10px 12px",
          },
          success: {
            iconTheme: { primary: "#8b7cff", secondary: "#15151a" },
          },
          error: {
            iconTheme: { primary: "#ff6b6b", secondary: "#15151a" },
          },
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[420px] bg-[radial-gradient(ellipse_at_50%_-20%,rgba(139,124,255,0.14),transparent_62%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

      <Header hasSvg={Boolean(svgContent)} onReset={reset} />

      <AnimatePresence>{isDragActive && <DropOverlay />}</AnimatePresence>

      <main className="relative z-10 flex-1 lg:min-h-0">
        {svgContent ? (
          <Workspace
            key="workspace"
            preview={preview}
            fileName={fileName}
            fileSize={fileSize}
            tint={tint}
            size={size}
            showGrid={showGrid}
            componentName={componentName}
            fileType={fileType}
            view={view}
            code={activeCode}
            lineCount={lineCount}
            copied={copied}
            onOpen={open}
            onTintChange={setTint}
            onSizeChange={setSize}
            onToggleGrid={() => setShowGrid((value) => !value)}
            onRemove={reset}
            onComponentNameChange={setComponentName}
            onFileTypeChange={setFileType}
            onViewChange={setView}
            onCopy={copyToClipboard}
          />
        ) : (
          <EmptyState
            key="empty"
            isDragActive={isDragActive}
            onOpen={open}
            onPaste={pasteFromClipboard}
            onSample={handleSample}
          />
        )}
      </main>
    </div>
  );
}

function Header({ hasSvg, onReset }: { hasSvg: boolean; onReset: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-line bg-ink-950/70 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent shadow-[0_0_24px_-8px_rgba(139,124,255,0.7)]">
          <LogoMark className="h-4 w-4" />
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold tracking-tight text-fg">
            SVG<span className="text-accent">2</span>React
          </span>
          <span className="hidden rounded-full border border-line px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-fg-subtle sm:inline">
            beta
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {hasSvg && (
          <button
            type="button"
            onClick={onReset}
            aria-label="Start a new conversion"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11.5px] font-medium text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-fg"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New</span>
          </button>
        )}

        <a
          href="https://github.com/The-End-Hero/svg2react"
          target="_blank"
          rel="noreferrer"
          aria-label="Open the SVG2React GitHub repository"
          className="inline-flex h-8 items-center gap-2 rounded-lg border border-line bg-white/[0.02] px-2.5 text-[11.5px] font-medium text-fg-muted transition-colors hover:border-line-strong hover:bg-white/[0.05] hover:text-fg"
        >
          <GithubIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">GitHub</span>
        </a>
      </div>
    </header>
  );
}

function DropOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-ink-950/75 backdrop-blur-md"
    >
      <div className="absolute inset-3 rounded-2xl border border-dashed border-accent/40" />
      <div className="flex flex-col items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-accent shadow-[0_0_48px_-10px_rgba(139,124,255,0.8)]">
          <UploadIcon className="h-6 w-6" />
        </span>
        <p className="text-[15px] font-medium text-fg">Drop to convert</p>
        <p className="text-[11.5px] text-fg-muted">SVG only · up to 2 MB</p>
      </div>
    </motion.div>
  );
}

function EmptyState({
  isDragActive,
  onOpen,
  onPaste,
  onSample,
}: {
  isDragActive: boolean;
  onOpen: () => void;
  onPaste: () => void;
  onSample: (sample: SvgSample) => void;
}) {
  return (
    <section className="dark-scroll flex min-h-[calc(100vh-3.5rem)] overflow-y-auto px-4 py-12 sm:px-6 lg:h-full lg:min-h-0">
      <div className="m-auto w-full max-w-[760px]">
        <div className="mb-7 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/[0.02] px-3 py-1 text-[10.5px] text-fg-muted">
            <LockIcon className="h-3 w-3 text-accent/80" />
            100% local · your SVG is processed in the browser
          </span>
        </div>

        <h1 className="text-center text-[38px] leading-[1.02] font-semibold tracking-[-0.045em] text-fg sm:text-[52px]">
          SVG in.{" "}
          <span className="bg-gradient-to-br from-accent-soft to-accent bg-clip-text text-transparent">
            React
          </span>{" "}
          out.
        </h1>

        <p className="mx-auto mt-4 max-w-[500px] text-center text-[13.5px] leading-6 text-fg-muted sm:text-[14.5px]">
          Drop an SVG and get a clean, typed React component — optimized paths,
          sensible props, no cleanup.
        </p>

        <div className="mt-9">
          <button
            type="button"
            onClick={onOpen}
            className={clsx(
              "group relative flex w-full flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-11 text-center transition-all duration-200",
              isDragActive
                ? "border-accent/60 bg-accent/[0.06]"
                : "border-white/[0.12] bg-white/[0.015] hover:border-accent/35 hover:bg-white/[0.03]",
            )}
          >
            <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-ink-800 text-accent shadow-[0_12px_32px_-16px_rgba(139,124,255,0.8)] transition-transform duration-200 group-hover:-translate-y-0.5">
              <UploadIcon className="h-5 w-5" />
            </span>
            <span className="text-[15px] font-medium text-fg">
              Drop your SVG here
            </span>
            <span className="mt-1.5 text-[12.5px] text-fg-muted">
              or click to browse — .svg up to 2 MB
            </span>
          </button>

          <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-fg-subtle">
            <button
              type="button"
              onClick={onPaste}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-white/[0.04] hover:text-fg-muted"
            >
              <ClipboardIcon className="h-3 w-3" />
              Paste from clipboard
            </button>
            <span className="text-white/15">·</span>
            <span className="font-mono text-[10px]">Ctrl/⌘ V</span>
          </div>
        </div>

        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
            Try a sample
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {samples.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => onSample(sample)}
                className="group inline-flex items-center gap-2 rounded-lg border border-line bg-white/[0.02] py-1.5 pr-3 pl-1.5 text-[11.5px] font-medium text-fg-muted transition-colors hover:border-accent/30 hover:bg-accent/[0.06] hover:text-fg"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.04] text-fg transition-colors group-hover:bg-white/[0.07]">
                  <span
                    className="block h-4 w-4 [&>svg]:h-full [&>svg]:w-full"
                    dangerouslySetInnerHTML={{ __html: sample.svg }}
                  />
                </span>
                {sample.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {FEATURES.map((feature) => {
            const FeatureIcon = feature.icon;

            return (
              <div
                key={feature.title}
                className="flex items-start gap-3 rounded-xl border border-line bg-white/[0.015] p-3.5"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-ink-800 text-fg-muted">
                  <FeatureIcon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-[12px] font-medium text-fg">
                    {feature.title}
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-fg-subtle">
                    {feature.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

interface WorkspaceProps {
  preview: PreparedSvg | null;
  fileName: string;
  fileSize: number;
  tint: string | null;
  size: number;
  showGrid: boolean;
  componentName: string;
  fileType: FileType;
  view: View;
  code: string;
  lineCount: number;
  copied: boolean;
  onOpen: () => void;
  onTintChange: (value: string | null) => void;
  onSizeChange: (value: number) => void;
  onToggleGrid: () => void;
  onRemove: () => void;
  onComponentNameChange: (value: string) => void;
  onFileTypeChange: (value: FileType) => void;
  onViewChange: (value: View) => void;
  onCopy: () => void;
}

function Workspace({
  preview,
  fileName,
  fileSize,
  tint,
  size,
  showGrid,
  componentName,
  fileType,
  view,
  code,
  lineCount,
  copied,
  onOpen,
  onTintChange,
  onSizeChange,
  onToggleGrid,
  onRemove,
  onComponentNameChange,
  onFileTypeChange,
  onViewChange,
  onCopy,
}: WorkspaceProps) {
  return (
    <section className="flex flex-col p-3 sm:p-4 lg:h-full lg:min-h-0">
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-2xl border border-line bg-ink-900/70 shadow-[0_32px_100px_-48px_rgba(0,0,0,0.9)] lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
        <section className="flex min-h-[440px] flex-col border-b border-line lg:min-h-0 lg:border-r lg:border-b-0">
          <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-3.5 w-3.5 text-fg-subtle" />
              <span className="hidden text-[10px] font-medium tracking-[0.14em] text-fg-muted uppercase sm:inline">
                Preview
              </span>
              <span className="hidden items-center gap-1 text-[9.5px] text-fg-subtle sm:flex">
                <span className="h-1 w-1 rounded-full bg-accent motion-safe:animate-pulse" />
                Live
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
              <TintControl value={tint} onChange={onTintChange} />
              <SizeControl
                key={fileName}
                value={size}
                onChange={onSizeChange}
              />

              <button
                type="button"
                onClick={onToggleGrid}
                aria-pressed={showGrid}
                aria-label="Toggle canvas grid"
                title="Toggle canvas grid"
                className={clsx(
                  "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                  showGrid
                    ? "bg-white/[0.06] text-fg"
                    : "text-fg-subtle hover:bg-white/[0.04] hover:text-fg-muted",
                )}
              >
                <GridIcon className="h-3.5 w-3.5" />
              </button>

              <span className="mx-0.5 hidden h-4 w-px bg-line sm:block" />

              <button
                type="button"
                onClick={onOpen}
                aria-label="Replace SVG"
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[10.5px] font-medium text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-fg"
              >
                <UploadIcon className="h-3 w-3" />
                <span className="hidden sm:inline">Replace</span>
              </button>

              <button
                type="button"
                onClick={onRemove}
                aria-label="Remove SVG"
                title="Remove SVG"
                className="flex h-8 w-8 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
            <div className="relative min-h-0 flex-1">
              <div
                className={clsx(
                  "light-scroll canvas-surface absolute inset-0 flex overflow-auto rounded-xl",
                  showGrid && "canvas-grid",
                )}
              >
                {preview ? (
                  <div className="m-auto flex flex-col items-center gap-4 p-6 sm:p-10">
                    <div className="rounded-lg border border-dashed border-black/[0.14] p-4">
                      <SvgPreview
                        markup={preview.markup}
                        width={preview.width}
                        height={preview.height}
                      />
                    </div>
                    <span className="rounded-full border border-black/[0.06] bg-black/[0.03] px-2.5 py-1 font-mono text-[9.5px] tabular-nums text-black/50">
                      {preview.width} × {preview.height} px
                    </span>
                  </div>
                ) : (
                  <div className="m-auto p-8 text-center text-[12px] text-black/50">
                    Couldn't render this SVG.
                  </div>
                )}
              </div>

              <span className="pointer-events-none absolute top-3 left-3 z-20 font-mono text-[9px] tracking-[0.14em] text-black/45 uppercase">
                Canvas
              </span>
              <span
                className="pointer-events-none absolute top-3 right-3 z-20 max-w-[45%] truncate font-mono text-[9px] text-black/55"
                title={fileName}
              >
                {fileName}
              </span>
            </div>

            <div className="mt-2 flex shrink-0 items-center justify-between gap-3 px-0.5 text-[10px] text-fg-subtle">
              <span className="truncate font-mono">
                {preview?.viewBox ? `viewBox ${preview.viewBox}` : "No viewBox"}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {fileSize > 0 && (
                  <span className="tabular-nums">{formatBytes(fileSize)}</span>
                )}
                {fileSize > 0 && <span className="h-2.5 w-px bg-line" />}
                <span className="inline-flex items-center gap-1">
                  <LockIcon className="h-2.5 w-2.5" />
                  Local only
                </span>
              </span>
            </div>
          </div>
        </section>

        <section className="flex min-h-[520px] flex-col lg:min-h-0">
          <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <FileCodeIcon className="hidden h-3.5 w-3.5 shrink-0 text-fg-subtle sm:block" />
              <input
                value={componentName}
                onChange={(event) => onComponentNameChange(event.target.value)}
                onBlur={() =>
                  onComponentNameChange(normalizeComponentName(componentName))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
                spellCheck={false}
                autoComplete="off"
                aria-label="Component name"
                placeholder="SvgComponent"
                className="w-28 truncate rounded bg-transparent font-mono text-[12px] font-medium text-fg placeholder:text-fg-subtle focus-visible:bg-white/[0.04] sm:w-40"
              />
              <span className="font-mono text-[12px] text-fg-subtle">
                .{fileType}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <FileTypeControl value={fileType} onChange={onFileTypeChange} />
              <button
                type="button"
                onClick={onCopy}
                className={clsx(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11.5px] font-medium transition-all active:scale-[0.98]",
                  copied
                    ? "bg-white/[0.08] text-fg"
                    : "bg-accent text-ink-950 shadow-[0_0_24px_-8px_rgba(139,124,255,0.8)] hover:bg-accent-soft",
                )}
              >
                {copied ? (
                  <CheckIcon className="h-3.5 w-3.5" />
                ) : (
                  <CopyIcon className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="flex h-10 shrink-0 items-center justify-between border-b border-line px-3">
            <div
              className="flex h-full items-center gap-1"
              role="tablist"
              aria-label="Output view"
            >
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`output-tab-${tab.id}`}
                  aria-selected={view === tab.id}
                  aria-controls="output-panel"
                  onClick={() => onViewChange(tab.id)}
                  className={clsx(
                    "relative flex h-full items-center px-2 text-[11.5px] font-medium transition-colors",
                    view === tab.id
                      ? "text-fg"
                      : "text-fg-subtle hover:text-fg-muted",
                  )}
                >
                  {tab.label}
                  {view === tab.id && (
                    <motion.span
                      layoutId="output-tab-underline"
                      className="absolute inset-x-1.5 -bottom-px h-px bg-accent"
                      transition={{
                        type: "spring",
                        stiffness: 520,
                        damping: 40,
                      }}
                    />
                  )}
                </button>
              ))}
            </div>

            <span className="font-mono text-[9.5px] tabular-nums text-fg-subtle">
              {lineCount} {lineCount === 1 ? "line" : "lines"}
            </span>
          </div>

          <div
            id="output-panel"
            role="tabpanel"
            aria-labelledby={`output-tab-${view}`}
            className="dark-scroll relative min-h-0 flex-1 overflow-auto bg-ink-950/60"
          >
            <div key={view}>
              <CodeBlock
                code={code}
                language={view === "component" ? fileType : "xml"}
              />
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

function TintControl({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="flex h-8 items-center gap-1.5 rounded-md border border-line bg-white/[0.02] px-1.5 transition-colors focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/20">
      <span
        className="relative h-4 w-4 overflow-hidden rounded-[4px] ring-1 ring-white/20 ring-inset"
        style={{ backgroundColor: value ?? "#111111" }}
      >
        <input
          type="color"
          value={value ?? "#111111"}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Preview tint"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </span>
      <span className="w-9 font-mono text-[9.5px] tracking-wide text-fg-muted uppercase">
        {value ? value.replace("#", "") : "ORIG"}
      </span>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Reset tint"
          title="Reset tint"
          className="rounded p-0.5 text-fg-subtle transition-colors hover:bg-white/[0.06] hover:text-fg"
        >
          <XIcon className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}

function SizeControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? String(value);

  const commit = () => {
    const parsed = Number.parseInt(display, 10);
    const next = clampSize(Number.isFinite(parsed) ? parsed : value);
    setDraft(null);
    onChange(next);
  };

  const step = (delta: number) => {
    setDraft(null);
    onChange(clampSize(value + delta));
  };

  return (
    <div className="flex h-8 items-center rounded-md border border-line bg-white/[0.02] transition-colors focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/20">
      <button
        type="button"
        onClick={() => step(-8)}
        aria-label="Decrease preview size"
        className="flex h-full w-6 items-center justify-center rounded-l-md text-fg-subtle transition-colors hover:bg-white/[0.05] hover:text-fg"
      >
        <MinusIcon className="h-3 w-3" />
      </button>

      <input
        type="number"
        value={display}
        min={MIN_SIZE}
        max={MAX_SIZE}
        onChange={(event) => {
          setDraft(event.target.value);
          const parsed = Number.parseInt(event.target.value, 10);

          if (
            Number.isFinite(parsed) &&
            parsed >= MIN_SIZE &&
            parsed <= MAX_SIZE
          ) {
            onChange(parsed);
          }
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        aria-label="Preview size in pixels"
        className="w-8 appearance-none bg-transparent text-center font-mono text-[10px] tabular-nums text-fg outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      <span className="pr-1 text-[8.5px] text-fg-subtle">px</span>

      <button
        type="button"
        onClick={() => step(8)}
        aria-label="Increase preview size"
        className="flex h-full w-6 items-center justify-center rounded-r-md text-fg-subtle transition-colors hover:bg-white/[0.05] hover:text-fg"
      >
        <PlusIcon className="h-3 w-3" />
      </button>
    </div>
  );
}

function FileTypeControl({
  value,
  onChange,
}: {
  value: FileType;
  onChange: (value: FileType) => void;
}) {
  return (
    <div
      className="flex h-8 items-center rounded-md border border-line bg-white/[0.02] p-0.5"
      role="group"
      aria-label="Output file type"
    >
      {(["tsx", "jsx"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={clsx(
            "relative flex h-full items-center rounded-[5px] px-2 font-mono text-[9.5px] uppercase tracking-wide transition-colors",
            value === option ? "text-fg" : "text-fg-subtle hover:text-fg-muted",
          )}
        >
          {value === option && (
            <motion.span
              layoutId="file-type-pill"
              className="absolute inset-0 rounded-[5px] bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              transition={{ type: "spring", stiffness: 520, damping: 38 }}
            />
          )}
          <span className="relative z-10">{option}</span>
        </button>
      ))}
    </div>
  );
}
