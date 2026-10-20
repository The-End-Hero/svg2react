export interface PreparedSvg {
  markup: string;
  width: number;
  height: number;
  viewBox: string | null;
}

const BLOCKED_TAGS = new Set([
  "script",
  "foreignobject",
  "iframe",
  "object",
  "embed",
]);

function sanitize(root: Element) {
  const elements = [root, ...Array.from(root.querySelectorAll("*"))];

  for (const element of elements) {
    if (element !== root && BLOCKED_TAGS.has(element.tagName.toLowerCase())) {
      element.remove();
      continue;
    }

    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();

      if (name.startsWith("on")) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (
        (name === "href" || name === "xlink:href") &&
        /^\s*(javascript:|data:text\/html)/i.test(attribute.value)
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  }
}

function readAspectRatio(root: Element): number {
  const viewBox = root.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (
      parts.length === 4 &&
      parts.every(Number.isFinite) &&
      parts[2] > 0 &&
      parts[3] > 0
    ) {
      return parts[2] / parts[3];
    }
  }

  const width = Number.parseFloat(root.getAttribute("width") ?? "");
  const height = Number.parseFloat(root.getAttribute("height") ?? "");

  if (
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0
  ) {
    return width / height;
  }

  return 1;
}

function applyTint(root: Element, tint: string) {
  root.setAttribute("color", tint);

  const elements = [root, ...Array.from(root.querySelectorAll("*"))];
  const colorAttributes = [
    "fill",
    "stroke",
    "stop-color",
    "flood-color",
    "lighting-color",
  ];

  for (const element of elements) {
    for (const attribute of colorAttributes) {
      const value = element.getAttribute(attribute);

      if (!value || value === "none" || value.startsWith("url(")) {
        continue;
      }

      element.setAttribute(attribute, tint);
    }
  }
}

export function prepareSvg(
  svgContent: string,
  size: number,
  tint: string | null,
): PreparedSvg {
  const doc = new DOMParser().parseFromString(svgContent, "image/svg+xml");

  if (doc.querySelector("parsererror")) {
    throw new Error("That file isn't a valid SVG.");
  }

  const root = doc.documentElement;

  if (!root || root.tagName.toLowerCase() !== "svg") {
    throw new Error("That file isn't a valid SVG.");
  }

  sanitize(root);

  const aspectRatio = readAspectRatio(root);
  const requested = Number.isFinite(size) ? Math.round(size) : 120;
  const longestSide = Math.min(512, Math.max(16, requested));

  const width =
    aspectRatio >= 1
      ? longestSide
      : Math.max(1, Math.round(longestSide * aspectRatio));
  const height =
    aspectRatio >= 1
      ? Math.max(1, Math.round(longestSide / aspectRatio))
      : longestSide;

  root.setAttribute("width", String(width));
  root.setAttribute("height", String(height));
  root.setAttribute("preserveAspectRatio", "xMidYMid meet");
  root.setAttribute("color", tint ?? "#111111");

  const style = root.getAttribute("style");
  if (style) {
    root.setAttribute(
      "style",
      style.replace(/(^|;)\s*(width|height)\s*:\s*[^;]+/gi, "$1").trim(),
    );
  }

  if (tint) {
    applyTint(root, tint);
  }

  return {
    markup: root.outerHTML,
    width,
    height,
    viewBox: root.getAttribute("viewBox"),
  };
}

export function prettyPrintSvg(markup: string): string {
  const compact = markup.trim();

  if (!compact.includes("><")) {
    return compact;
  }

  const withBreaks = compact.replace(/(>)(<)(\/*)/g, "$1\n$2$3");
  let depth = 0;

  return withBreaks
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return "";
      }

      if (/^<\//.test(trimmed)) {
        depth = Math.max(0, depth - 1);
      }

      const indented = `${"  ".repeat(depth)}${trimmed}`;
      const isOpeningTag =
        /^<[^!?/][^>]*[^/]>$/.test(trimmed) && !trimmed.includes("</");

      if (isOpeningTag) {
        depth += 1;
      }

      return indented;
    })
    .join("\n");
}

export function normalizeComponentName(name: string): string {
  const words = name.split(/[^a-zA-Z0-9_$]+/).filter(Boolean);

  if (words.length === 0) {
    return "SvgComponent";
  }

  const joined = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

  return /^[A-Z]/.test(joined) ? joined : `Svg${joined}`;
}

export function fileNameToComponentName(fileName: string): string {
  return normalizeComponentName(fileName.replace(/\.[^.]+$/, ""));
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
}
