interface SvgPreviewProps {
  markup: string;
  width: number;
  height: number;
}

export function SvgPreview({ markup, width, height }: SvgPreviewProps) {
  return (
    <div
      className="relative"
      style={{ width, height }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
