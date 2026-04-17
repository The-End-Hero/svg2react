export type FileType = "tsx" | "jsx";

// 将 SVG 属性名从 kebab-case 转成 React JSX 使用的 camelCase。
const toReactAttrName = (attrName: string): string =>
  attrName.replace(/-([a-z])/g, (_: string, letter: string) =>
    letter.toUpperCase(),
  );

// 将 style 字符串转换为 React style 对象字面量字符串。
const toReactStyleLiteral = (styleValue: string): string => {
  const styleEntries = styleValue
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const colonIndex = entry.indexOf(":");
      if (colonIndex === -1) return null;
      const rawName = entry.slice(0, colonIndex).trim();
      const rawValue = entry.slice(colonIndex + 1).trim();
      if (!rawName || !rawValue) return null;
      return [toReactAttrName(rawName), rawValue.replace(/"/g, '\\"')] as const;
    })
    .filter((entry): entry is readonly [string, string] => entry !== null);

  if (!styleEntries.length) return "{{}}";

  const styleBody = styleEntries
    .map(([name, value]) => `${name}: "${value}"`)
    .join(", ");

  return `{{ ${styleBody} }}`;
};

// 规范化原始 SVG 字符串，便于后续稳定转换与展示。
export const formatSvg = (svgString: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const svgElement = doc.documentElement;

  // 统一根节点属性顺序，减少同一 SVG 的无意义差异。
  const attributes = Array.from(svgElement.attributes)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((attr) => `${attr.name}="${attr.value}"`)
    .join(" ");

  let content = svgElement.innerHTML;
  // 将自闭合标签展开，避免后续字符串拼接时出现格式兼容问题。
  content = content.replace(/<([^>]+)\/>/g, (_, tag) => {
    return `<${tag}></${tag.split(" ")[0]}>`;
  });

  // 压缩空白，避免 JSX 中出现多余文本节点。
  content = content.replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();

  return `<svg ${attributes}>${content}</svg>`;
};

// 轻量清理生成代码中的多余空行和首尾空白。
const formatReactCode = (code: string): string => {
  return code.replace(/\n\s*\n/g, "\n").replace(/^\s+|\s+$/g, "");
};

// 将 SVG 字符串转换成可复用 React 组件代码（TSX/JSX）。
export const convertToReactComponent = (
  svgString: string,
  name: string,
  fileType: FileType,
): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const svgElement = doc.documentElement;

  // 过滤不需要透传的根属性，并做属性名转换。
  const attributes = Array.from(svgElement.attributes)
    .filter((attr) => !["id", "width", "height"].includes(attr.name))
    .map((attr) => {
      const reactAttrName = toReactAttrName(attr.name);
      if (attr.name === "style") {
        return `style=${toReactStyleLiteral(attr.value)}`;
      }
      // 颜色统一改为 currentColor，保留 none 以维持原有镂空效果。
      if (["fill", "stroke"].includes(attr.name)) {
        if (attr.value === "none") return `${reactAttrName}="none"`;
        if (attr.value) return `${reactAttrName}="currentColor"`;
      }
      return `${reactAttrName}="${attr.value}"`;
    })
    .join(" ");

  let content = svgElement.innerHTML;
  content = content.replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();

  // 将内部 style 属性转换为 React 支持的对象形式。
  content = content.replace(/style="([^"]*)"/g, (_, styleValue: string) => {
    return `style=${toReactStyleLiteral(styleValue)}`;
  });

  // 内部节点同样执行颜色规范，保证整体受 currentColor 控制。
  content = content.replace(/(fill|stroke)="[^"]*"/g, (match, attr) => {
    if (match.includes('="none"')) return `${attr}="none"`;
    return `${attr}="currentColor"`;
  });

  // 内部节点属性名也转换为 React 兼容写法。
  content = content.replace(/([a-z-]+)=/g, (_, attr: string) => {
    return `${toReactAttrName(attr)}=`;
  });

  // 按目标文件类型拼接 TSX 或 JSX 组件模板。
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
};
