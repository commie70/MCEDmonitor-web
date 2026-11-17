/**
 * SVG 文字的估算宽度：中日韩字符按全宽，其余按约 0.57 倍字号。
 * 图表里的标签避让与标签列宽都靠它，不依赖浏览器测量，服务端与客户端结果一致。
 */
export function textWidth(text: string, size: number): number {
  let width = 0;
  for (const char of text) width += char.charCodeAt(0) > 0x2e7f ? size : size * 0.57;
  return width;
}

/** 放不下时在末尾截断并加省略号。 */
export function fitText(text: string, maxWidth: number, size: number): string {
  if (textWidth(text, size) <= maxWidth) return text;
  let out = "";
  for (const char of text) {
    if (textWidth(`${out}${char}…`, size) > maxWidth) break;
    out += char;
  }
  return `${out.trimEnd()}…`;
}
