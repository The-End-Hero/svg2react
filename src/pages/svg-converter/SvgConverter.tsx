import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import clsx from "clsx";
import toast, { Toaster } from "react-hot-toast";

type FileType = "tsx" | "jsx";

export default function SvgConverter() {
  const [svgContent, setSvgContent] = useState<string>("");
  const [reactCode, setReactCode] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [componentName, setComponentName] = useState<string>("SvgComponent");
  const [fileType, setFileType] = useState<FileType>("tsx");

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
          return !["id"].includes(attr.name);
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
        (match: string, attr: string) => {
          console.log(match, attr);
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
}

export const ${name} = ({ title, ...props }: ${name}Props) => (
  <svg
    ${attributes}
    {...props}
  >
    {title && <title>{title}</title>}
    ${content}
  </svg>
);

${name}.displayName = '${name}';

export default ${name};`
          : `import React from 'react';

export const ${name} = ({ title, ...props }) => (
  <svg
    ${attributes}
    {...props}
  >
    {title && <title>{title}</title>}
    ${content}
  </svg>
);

${name}.displayName = '${name}';

export default ${name};`;

      return componentCode;
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
      const pascalCaseName = fileName
        .split(/[-_\s]/)
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join("");
      const newComponentName = pascalCaseName || "SvgComponent";
      setComponentName(newComponentName);

      const text = await file.text();

      const optimizedSvg = text
        .replace(/\s+/g, " ")
        .replace(/>\s+</g, "><")
        .trim();

      setSvgContent(optimizedSvg);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <Toaster />
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
            SVG to React Component
          </h1>
          <p className="text-lg text-gray-600">
            Transform your SVG files into reusable React components
          </p>
        </div>

        <div
          {...getRootProps()}
          className={clsx(
            "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer mb-8 transition-all duration-200 ease-in-out",
            isDragActive
              ? "border-blue-500 bg-blue-50 scale-105"
              : "border-gray-300 hover:border-blue-400 hover:bg-gray-50",
          )}
        >
          <input {...getInputProps()} />
          <div className="space-y-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
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
              <p className="text-lg font-medium text-blue-600">
                Drop your SVG file here
              </p>
            ) : (
              <div>
                <p className="text-lg font-medium text-gray-900">
                  Drag and drop your SVG file here
                </p>
                <p className="text-sm text-gray-500 mt-1">or click to browse</p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
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
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {svgContent && (
          <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Preview
            </h2>
            <div
              className="border border-gray-200 rounded-lg p-6 bg-white flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </div>
        )}

        {reactCode && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                React Component
              </h2>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">
                    File Type:
                  </label>
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value as FileType)}
                    className="block w-24 px-3 py-2 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  >
                    <option value="tsx">TSX</option>
                    <option value="jsx">JSX</option>
                  </select>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
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

            <div className="mb-6">
              <label
                htmlFor="componentName"
                className="block text-base font-medium text-gray-900 mb-2"
              >
                Component Name
              </label>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="text"
                  id="componentName"
                  value={componentName}
                  onChange={handleComponentNameChange}
                  className="block w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  placeholder="Enter component name"
                />
              </div>
            </div>
            <div className="relative">
              <pre className="bg-gray-50 rounded-lg p-4 overflow-x-auto text-sm">
                <code className="text-gray-800">{reactCode}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
