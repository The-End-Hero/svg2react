import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import clsx from "clsx";
import toast, { Toaster } from "react-hot-toast";
import { Highlight, themes } from "prism-react-renderer";
import { posthog } from "posthog-js";
// import {
//   convertToReactComponent,
//   formatSvg,
//   type FileType,
// } from "./svgConverter.utils";
import {
  convertToReactComponent,
  formatSvg,
  type FileType,
} from "@xiping/svg-to-react";

interface PreviewProps {
  svgContent: string;
  color: string;
  size: number;
}

interface UploadZoneProps {
  title: string;
  subtitle: string;
  hint?: string;
  isDragActive: boolean;
  onOpen: () => void;
  className?: string;
}

const UploadZone = ({
  title,
  subtitle,
  hint,
  isDragActive,
  onOpen,
  className,
}: UploadZoneProps) => {
  return (
    <button
      type="button"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={clsx(
        "w-full rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors duration-200",
        isDragActive
          ? "border-blue-400 bg-blue-500/10"
          : "border-gray-600 bg-gray-800/50 hover:border-gray-500",
        className,
      )}
    >
      <p className="text-sm md:text-base font-medium text-gray-100">{title}</p>
      <p className="text-xs md:text-sm text-gray-300 mt-2">{subtitle}</p>
      {hint && <p className="text-xs text-gray-400 mt-2">{hint}</p>}
    </button>
  );
};

const Preview = ({ svgContent, color, size }: PreviewProps) => {
  // 创建一个临时的 DOM 元素来解析 SVG
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, "image/svg+xml");
  const svgElement = doc.documentElement;

  // 设置 SVG 的宽度和高度
  svgElement.setAttribute("width", `${size}`);
  svgElement.setAttribute("height", `${size}`);

  // 处理内部元素的颜色，保持原有的空心/实心特性
  const elements = svgElement.getElementsByTagName("*");
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const originalFill = element.getAttribute("fill");
    const originalStroke = element.getAttribute("stroke");

    // 只有当元素原本有颜色时才设置新颜色，保持none值不变
    if (originalFill && originalFill !== "none") {
      element.setAttribute("fill", color);
    }
    if (originalStroke && originalStroke !== "none") {
      element.setAttribute("stroke", color);
    }
  }

  // 设置根SVG元素的默认颜色（如果没有子元素设置的话）
  // 只有当根元素没有fill属性，或者fill不是none时才设置默认颜色
  const rootFill = svgElement.getAttribute("fill");
  if (!rootFill || (rootFill && rootFill !== "none")) {
    svgElement.setAttribute("fill", color);
  }

  const rootStroke = svgElement.getAttribute("stroke");
  if (!rootStroke || (rootStroke && rootStroke !== "none")) {
    svgElement.setAttribute("stroke", color);
  }

  return (
    <div className="relative border border-gray-700 rounded-lg p-6 bg-white">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(45deg, #f3f4f6 25%, transparent 25%),
            linear-gradient(-45deg, #f3f4f6 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #f3f4f6 75%),
            linear-gradient(-45deg, transparent 75%, #f3f4f6 75%)`,
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
          opacity: 0.1,
        }}
      />
      <div
        className="relative flex items-center justify-center min-h-[80px]"
        dangerouslySetInnerHTML={{ __html: svgElement.outerHTML }}
      />
    </div>
  );
};

const CodeBlock = ({ code, language }: { code: string; language: string }) => {
  return (
    <div className="relative w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500">
      <div className="min-w-full inline-block">
        <Highlight
          theme={themes.nightOwl}
          code={code.trim()}
          language={language}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre className={className} style={{ ...style, margin: 0 }}>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })} className="table-row">
                  <span className="table-cell text-right pr-4 select-none text-gray-500 w-8">
                    {i + 1}
                  </span>
                  <span className="table-cell whitespace-pre-wrap break-words max-w-[800px]">
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </span>
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
};

const SvgPreview = ({ svgContent }: { svgContent: string }) => {
  return (
    <div className="relative border border-gray-700 rounded-lg p-6 bg-white">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(45deg, #f3f4f6 25%, transparent 25%),
            linear-gradient(-45deg, #f3f4f6 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #f3f4f6 75%),
            linear-gradient(-45deg, transparent 75%, #f3f4f6 75%)`,
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
          opacity: 0.1,
        }}
      />
      <div
        className="relative flex items-center justify-center min-h-[80px]"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
};

export default function SvgConverter() {
  const [svgContent, setSvgContent] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [componentName, setComponentName] = useState<string>("SvgComponent");
  const [fileType, setFileType] = useState<FileType>("tsx");
  const [previewColor, setPreviewColor] = useState<string>("#000000");
  const [previewSize, setPreviewSize] = useState<number>(100);

  const reactCode = useMemo(() => {
    if (!svgContent) return "";
    return convertToReactComponent(svgContent, componentName, fileType);
  }, [fileType, svgContent, componentName]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      setError("");
      const file = acceptedFiles[0];
      if (!file) return;

      const fileName = file.name.replace(/\.svg$/i, "");
      posthog.capture("drop svg file", { filename: fileName });
      const pascalCaseName = fileName
        .split(/[-_\s]/)
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join("");
      const newComponentName = pascalCaseName || "SvgComponent";
      setComponentName(newComponentName);

      const text = await file.text();

      // 格式化 SVG 内容
      const formattedSvg = formatSvg(text);
      setSvgContent(formattedSvg);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "image/svg+xml": [".svg"],
    },
    multiple: false,
    noClick: true,
  });

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(reactCode);
      toast.success("Code copied to clipboard!");
    } catch (e) {
      console.log(e);
    }
  };

  const handleComponentNameChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newName = e.target.value;
    setComponentName(newName);
  };

  const openGithub = () => {
    window.open("https://github.com/The-End-Hero/svg2react", "_blank");
  };

  return (
    <div
      {...getRootProps()}
      className={clsx(
        "h-screen bg-gray-900 flex flex-col transition-all duration-200 ease-in-out",
        isDragActive && "bg-gray-800",
      )}
    >
      <input {...getInputProps()} />
      <Toaster />
      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
        <div className="text-center mb-4 md:mb-6">
          <div className="flex items-center justify-center gap-4">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              SVG to React Component
            </h1>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openGithub();
              }}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-xs text-white bg-gray-700 hover:bg-gray-600 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
            >
              <svg
                className="h-5 w-5 mr-2"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              GitHub
            </button>
          </div>
          <p className="text-sm md:text-base text-gray-400 mt-1">
            Transform your SVG files into reusable React components
          </p>
        </div>

        {!svgContent && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl space-y-4">
              <svg
                className="mx-auto h-16 w-16 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <UploadZone
                title={
                  isDragActive
                    ? "Drop your SVG file to upload"
                    : "Click to choose an SVG file"
                }
                subtitle="You can also drag and drop an SVG anywhere on this page."
                hint="Only .svg files are accepted."
                isDragActive={isDragActive}
                onOpen={open}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border-l-4 border-red-400 p-3 rounded-r-lg shrink-0">
            <div className="flex">
              <div className="shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}

        {svgContent && (
          <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
            <UploadZone
              title={
                isDragActive
                  ? "Drop to replace current SVG"
                  : "Replace current SVG"
              }
              subtitle="Click this area to choose another SVG file."
              hint="You can also drag and drop an SVG anywhere on this page."
              isDragActive={isDragActive}
              onOpen={open}
              className="shrink-0"
            />
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 min-h-0 overflow-hidden">
              {/* 左侧面板 */}
              <div className="flex flex-col space-y-4 min-h-0 overflow-hidden">
                <div className="flex-1 flex flex-col space-y-4 min-h-0 overflow-hidden">
                  <div className="bg-gray-800 rounded-xl shadow-xs p-4 shrink-0">
                    <h2 className="text-lg font-semibold text-white mb-3">
                      SVG Preview
                    </h2>
                    <SvgPreview svgContent={svgContent} />
                  </div>

                  <div className="bg-gray-800 rounded-xl shadow-xs p-4 flex-1 min-h-0 overflow-hidden">
                    <h2 className="text-lg font-semibold text-white mb-3">
                      SVG Source
                    </h2>
                    <div className="rounded-lg overflow-hidden bg-gray-900 h-[calc(100%-2rem)]">
                      <CodeBlock code={svgContent} language="xml" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 右侧面板 */}
              {reactCode && (
                <div className="bg-gray-800 rounded-xl shadow-xs p-4 flex flex-col min-h-0 overflow-hidden">
                  <div className="flex flex-wrap justify-between items-center gap-4 mb-4 shrink-0">
                    <h2 className="text-lg font-semibold text-white">
                      React Component
                    </h2>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-gray-300">
                          File Type:
                        </label>
                        <select
                          value={fileType}
                          onChange={(e) =>
                            setFileType(e.target.value as FileType)
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="block w-24 px-3 py-1.5 text-sm border-2 border-gray-600 rounded-lg bg-gray-700 text-gray-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                        >
                          <option value="tsx">TSX</option>
                          <option value="jsx">JSX</option>
                        </select>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard();
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-xs text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                      >
                        <svg
                          className="h-4 w-4 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                          />
                        </svg>
                        Copy Code
                      </button>
                    </div>
                  </div>

                  <div className="mb-4 shrink-0">
                    <label
                      htmlFor="componentName"
                      className="block text-sm font-medium text-gray-200 mb-2"
                    >
                      Component Name
                    </label>
                    <div className="relative rounded-md shadow-xs">
                      <input
                        type="text"
                        id="componentName"
                        value={componentName}
                        onChange={handleComponentNameChange}
                        onClick={(e) => e.stopPropagation()}
                        className="block w-full px-3 py-1.5 text-sm border-2 border-gray-600 rounded-lg bg-gray-700 text-gray-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                        placeholder="Enter component name"
                      />
                    </div>
                  </div>

                  <div className="mb-4 shrink-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="previewColor"
                          className="block text-sm font-medium text-gray-200 mb-2"
                        >
                          Color
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            id="previewColor"
                            value={previewColor}
                            onChange={(e) => setPreviewColor(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-8 w-8 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={previewColor}
                            onChange={(e) => setPreviewColor(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="block w-full px-3 py-1.5 text-sm border-2 border-gray-600 rounded-lg bg-gray-700 text-gray-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                          />
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor="previewSize"
                          className="block text-sm font-medium text-gray-200 mb-2"
                        >
                          Size (px)
                        </label>
                        <input
                          type="number"
                          id="previewSize"
                          value={previewSize}
                          onChange={(e) =>
                            setPreviewSize(Number(e.target.value))
                          }
                          onClick={(e) => e.stopPropagation()}
                          min="10"
                          max="500"
                          className="block w-full px-3 py-1.5 text-sm border-2 border-gray-600 rounded-lg bg-gray-700 text-gray-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 shrink-0">
                    <h3 className="text-sm font-medium text-gray-200 mb-2">
                      Preview
                    </h3>
                    <div className="max-h-[200px] overflow-auto">
                      <Preview
                        svgContent={svgContent}
                        color={previewColor}
                        size={previewSize}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg overflow-hidden bg-gray-900 flex-1 min-h-0">
                    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500">
                      <CodeBlock code={reactCode} language={fileType} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
