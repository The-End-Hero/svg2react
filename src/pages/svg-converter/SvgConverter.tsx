import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import clsx from "clsx";

export default function SvgConverter() {
  const [svgContent, setSvgContent] = useState<string>("");
  const [reactCode, setReactCode] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [componentName, setComponentName] = useState<string>("SvgComponent");

  const convertToReactComponent = useCallback((svgString: string, name: string) => {
    // 创建一个临时的 DOM 元素来解析 SVG
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const svgElement = doc.documentElement;

    // 获取 SVG 的属性
    const attributes = Array.from(svgElement.attributes)
      .map((attr) => {
        // 处理颜色相关的属性
        if (["fill", "stroke"].includes(attr.name) && attr.value !== "none") {
          return `${attr.name}="currentColor"`;
        }
        return `${attr.name}="${attr.value}"`;
      })
      .join(" ");

    // 获取 SVG 的内容并处理内部元素的颜色
    let content = svgElement.innerHTML;
    content = content.replace(/(fill|stroke)="[^"]*"/g, (match, attr) => {
      if (match.includes("none")) return match;
      return `${attr}="currentColor"`;
    });

    // 生成 React 组件代码
    const componentCode = `import React from 'react';

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

export default ${name};`;

    return componentCode;
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      setError("");
      const file = acceptedFiles[0];
      if (!file) return;

      // 从文件名中提取组件名（移除.svg扩展名并转换为PascalCase）
      const fileName = file.name.replace(/\.svg$/i, "");
      const pascalCaseName = fileName
        .split(/[-_\s]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join("");
      const newComponentName = pascalCaseName || "SvgComponent";
      setComponentName(newComponentName);

      const text = await file.text();

      // 简单的 SVG 优化
      const optimizedSvg = text
        .replace(/\s+/g, " ")
        .replace(/>\s+</g, "><")
        .trim();

      setSvgContent(optimizedSvg);

      // 转换为 React 组件
      const jsCode = convertToReactComponent(optimizedSvg, newComponentName);
      setReactCode(jsCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "转换失败");
    }
  }, [convertToReactComponent]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/svg+xml": [".svg"],
    },
    multiple: false,
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(reactCode);
  };

  const handleComponentNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setComponentName(newName);
    if (svgContent) {
      const jsCode = convertToReactComponent(svgContent, newName);
      setReactCode(jsCode);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">SVG to React Component</h1>

      <div
        {...getRootProps()}
        className={clsx(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer mb-4",
          isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300",
        )}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the SVG file here...</p>
        ) : (
          <p>Drag and drop an SVG file here, or click to select</p>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {svgContent && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Preview</h2>
          <div
            className="border p-4 rounded"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        </div>
      )}

      {reactCode && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">React Component Code</h2>
            <button
              onClick={copyToClipboard}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Copy Code
            </button>
          </div>
          <div className="mb-4">
            <label htmlFor="componentName" className="block text-sm font-medium text-gray-700 mb-1">
              组件名称
            </label>
            <input
              type="text"
              id="componentName"
              value={componentName}
              onChange={handleComponentNameChange}
              className="border rounded px-3 py-2 w-full"
              placeholder="输入组件名称"
            />
          </div>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            <code>{reactCode}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
