import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import clsx from "clsx";
import toast, { Toaster } from "react-hot-toast";
import { Highlight, themes } from "prism-react-renderer";
import { posthog } from "posthog-js";

type FileType = "tsx" | "jsx";

interface PreviewProps {
  svgContent: string;
  color: string;
  size: number;
}

const Preview = ({ svgContent, color, size }: PreviewProps) => {
  // 创建一个临时的 DOM 元素来解析 SVG
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, "image/svg+xml");
  const svgElement = doc.documentElement;

  // 设置 SVG 的宽度和高度
  svgElement.setAttribute("width", `${size}`);
  svgElement.setAttribute("height", `${size}`);

  // 设置 SVG 的颜色
  svgElement.setAttribute("fill", color);
  svgElement.setAttribute("stroke", color);

  // 处理内部元素的颜色
  const elements = svgElement.getElementsByTagName("*");
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (element.getAttribute("fill") !== "none") {
      element.setAttribute("fill", color);
    }
    if (element.getAttribute("stroke") !== "none") {
      element.setAttribute("stroke", color);
    }
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
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          opacity: 0.1
        }}
      />
      <div
        className="relative flex items-center justify-center min-h-[200px]"
        dangerouslySetInnerHTML={{ __html: svgElement.outerHTML }}
      />
    </div>
  );
};

const CodeBlock = ({ code, language }: { code: string; language: string }) => {
  return (
    <div className="relative w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500">
      <div className="min-w-full inline-block">
        <Highlight theme={themes.nightOwl} code={code.trim()} language={language}>
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
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          opacity: 0.1
        }}
      />
      <div
        className="relative flex items-center justify-center min-h-[200px]"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
};

// 格式化 SVG 字符串
const formatSvg = (svgString: string): string => {
  // 创建一个临时的 DOM 元素来解析 SVG
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const svgElement = doc.documentElement;

  // 获取所有属性并排序
  const attributes = Array.from(svgElement.attributes)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(attr => `${attr.name}="${attr.value}"`)
    .join(" ");

  // 获取内部内容并格式化
  let content = svgElement.innerHTML;
  
  // 处理自闭合标签
  content = content.replace(/<([^>]+)\/>/g, (_, tag) => {
    return `<${tag}></${tag.split(" ")[0]}>`;
  });

  // 添加适当的缩进和换行
  content = content
    .replace(/>\s+</g, "><") // 移除标签之间的空白
    .replace(/<([^>]+)>/g, (_, tag) => {
      // 为每个标签添加缩进
      return `  <${tag}>`;
    });

  // 组合最终的格式化 SVG
  return `<svg ${attributes}>${content}</svg>`;
};

// 格式化 React 组件代码
const formatReactCode = (code: string): string => {
  // 移除多余的空行
  return code
    .replace(/\n\s*\n/g, '\n') // 移除连续的空行
    .replace(/^\s+|\s+$/g, ''); // 移除开头和结尾的空白
};

export default function SvgConverter() {
  const [svgContent, setSvgContent] = useState<string>("");
  const [reactCode, setReactCode] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [componentName, setComponentName] = useState<string>("SvgComponent");
  const [fileType, setFileType] = useState<FileType>("tsx");
  const [previewColor, setPreviewColor] = useState<string>("#000000");
  const [previewSize, setPreviewSize] = useState<number>(100);

  const convertToReactComponent = useCallback(
    (svgString: string, name: string) => {
      // 创建一个临时的 DOM 元素来解析 SVG
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, "image/svg+xml");
      const svgElement = doc.documentElement;

      // 转换属性名并过滤不需要的属性
      const attributes = Array.from(svgElement.attributes)
        .filter((attr) => {
          // 过滤掉不需要的属性
          return !["id", "width", "height"].includes(attr.name);
        })
        .map((attr) => {
          // 将连字符属性名转换为驼峰命名
          const reactAttrName = attr.name.replace(
            /-([a-z])/g,
            (_: string, letter: string) => letter.toUpperCase(),
          );

          // 处理颜色相关的属性
          if (["fill", "stroke"].includes(attr.name) && attr.value !== "none") {
            return `${reactAttrName}="currentColor"`;
          }
          return `${reactAttrName}="${attr.value}"`;
        })
        .join(" ");

      // 获取 SVG 的内容并处理内部元素的颜色和属性名
      let content = svgElement.innerHTML;
      content = content.replace(/(fill|stroke)="[^"]*"/g, (match, attr) => {
        if (match.includes("none")) return match;
        return `${attr}="currentColor"`;
      });

      // 处理内部元素的属性名
      content = content.replace(
        /([a-z-]+)=/g,
        (_, attr: string) => {
          const reactAttrName = attr.replace(
            /-([a-z])/g,
            (_: string, letter: string) => letter.toUpperCase(),
          );
          return `${reactAttrName}=`;
        },
      );

      // 移除内部元素的id属性
      content = content.replace(/\s+id="[^"]*"/g, "");

      // 根据文件类型生成不同的组件代码
      const componentCode =
        fileType === "tsx"
          ? `import React from 'react';

interface ${name}Props extends React.SVGProps<SVGSVGElement> {
  title?: string;
  size?: number;
}

export const ${name} = ({ title, size = 24, ...props }: ${name}Props) => (
  <svg width={size} height={size} ${attributes} {...props}>
    {title && <title>{title}</title>}
    ${content}
  </svg>
);

${name}.displayName = '${name}';

export default ${name};`
          : `import React from 'react';

export const ${name} = ({ title, size = 24, ...props }) => (
  <svg width={size} height={size} ${attributes} {...props}>
    {title && <title>{title}</title>}
    ${content}
  </svg>
);

${name}.displayName = '${name}';

export default ${name};`;

      return formatReactCode(componentCode);
    },
    [fileType],
  );

  // 当 fileType 或 svgContent 改变时重新生成代码
  useEffect(() => {
    if (svgContent) {
      const newCode = convertToReactComponent(svgContent, componentName);
      setReactCode(newCode);
    }
  }, [fileType, svgContent, componentName, convertToReactComponent]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      setError("");
      const file = acceptedFiles[0];
      if (!file) return;

      const fileName = file.name.replace(/\.svg$/i, "");
      posthog.capture('drop svg file', { filename: fileName })
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

  const { getRootProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/svg+xml": [".svg"],
    },
    multiple: false,
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
    window.open('https://github.com/The-End-Hero/svg2react', '_blank');
  };

  return (
    <div
      {...getRootProps()}
      className={clsx(
        "h-screen bg-gray-900 flex flex-col transition-all duration-200 ease-in-out",
        isDragActive && "bg-gray-800",
      )}
    >
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
            <div className="text-center space-y-4">
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
              {isDragActive ? (
                <p className="text-xl font-medium text-blue-400">
                  Drop your SVG file here
                </p>
              ) : (
                <div>
                  <p className="text-xl font-medium text-gray-200">
                    Drag and drop your SVG file here
                  </p>
                  <p className="text-base text-gray-400 mt-2">
                    or click anywhere to browse
                  </p>
                </div>
              )}
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
                        className="block w-24 px-3 py-1.5 text-sm border-2 border-gray-600 rounded-lg bg-gray-700 text-gray-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                      >
                        <option value="tsx">TSX</option>
                        <option value="jsx">JSX</option>
                      </select>
                    </div>
                    <button
                      onClick={copyToClipboard}
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
                          className="h-8 w-8 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={previewColor}
                          onChange={(e) => setPreviewColor(e.target.value)}
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
                        onChange={(e) => setPreviewSize(Number(e.target.value))}
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
        )}
      </div>
    </div>
  );
}
