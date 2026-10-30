// Minimal PDF writer: one JPEG per A4 page, embedded as-is (DCTDecode), so the
// PDF adds no re-compression and almost no size. No library needed.

const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN = 18;

export function makePdf(pages: { jpeg: Uint8Array; width: number; height: number }[]): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let len = 0;
  const push = (d: string | Uint8Array) => {
    const b = typeof d === "string" ? enc.encode(d) : d;
    chunks.push(b);
    len += b.length;
  };
  const obj = (n: number, parts: (string | Uint8Array)[]) => {
    offsets[n] = len;
    push(`${n} 0 obj\n`);
    parts.forEach(push);
    push("\nendobj\n");
  };

  push("%PDF-1.4\n");
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])); // binary marker line

  // Objects: 1 catalog, 2 page tree, then 3 per page (page, content, image).
  const pageId = (i: number) => 3 + i * 3;
  obj(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  obj(2, [`<< /Type /Pages /Kids [${pages.map((_, i) => `${pageId(i)} 0 R`).join(" ")}] /Count ${pages.length} >>`]);

  pages.forEach((p, i) => {
    const pid = pageId(i);
    // Fit the image inside the page margins, centred, keeping its shape.
    const s = Math.min((A4_W - 2 * MARGIN) / p.width, (A4_H - 2 * MARGIN) / p.height);
    const w = p.width * s;
    const h = p.height * s;
    const draw = `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${((A4_W - w) / 2).toFixed(2)} ${((A4_H - h) / 2).toFixed(2)} cm /Im${i} Do Q`;
    obj(pid, [
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_W} ${A4_H}] /Resources << /XObject << /Im${i} ${pid + 2} 0 R >> >> /Contents ${pid + 1} 0 R >>`,
    ]);
    obj(pid + 1, [`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`]);
    obj(pid + 2, [
      `<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`,
      p.jpeg,
      "\nendstream",
    ]);
  });

  const count = 3 + pages.length * 3;
  const xref = len;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) push(`${String(offsets[n]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}
