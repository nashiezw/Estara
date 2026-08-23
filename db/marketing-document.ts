const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]!));

export function marketingDocumentToSvg(doc: any) {
  const width = Math.max(1, Number(doc?.width || 1200));
  const height = Math.max(1, Number(doc?.height || 628));
  const elements = Array.isArray(doc?.elements) ? doc.elements : [];
  const body = [...elements].filter((item: any) => item?.visible !== false).sort((a: any, b: any) => Number(a.z || 0) - Number(b.z || 0)).map((item: any) => {
    const x = Number(item.x || 0), y = Number(item.y || 0), w = Math.max(1, Number(item.width || 1)), h = Math.max(1, Number(item.height || 1));
    const opacity = Math.max(0, Math.min(1, Number(item.opacity ?? 1)));
    const transform = `rotate(${Number(item.rotation || 0)} ${x + w / 2} ${y + h / 2})`;
    if (item.type === "image" || item.type === "logo") return `<image href="${esc(item.src)}" x="${x}" y="${y}" width="${w}" height="${h}" opacity="${opacity}" transform="${transform}" preserveAspectRatio="xMidYMid slice"/>`;
    if (item.type === "circle") return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${esc(item.fill || "#e8c45f")}" opacity="${opacity}" transform="${transform}"/>`;
    if (item.type === "rectangle" || item.type === "line") return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Number(item.radius || 0)}" fill="${esc(item.fill || "#103b32")}" opacity="${opacity}" transform="${transform}"/>`;
    return `<foreignObject x="${x}" y="${y}" width="${w}" height="${h}" opacity="${opacity}" transform="${transform}"><div xmlns="http://www.w3.org/1999/xhtml" style="font:${esc(item.fontWeight || "700")} ${Number(item.fontSize || 24)}px/1.05 ${esc(item.fontFamily || "Arial")};color:${esc(item.color || "#fff")};text-align:${esc(item.align || "left")}">${esc(item.type === "qr" ? "QR" : item.text)}</div></foreignObject>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
}
