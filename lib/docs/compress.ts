// Turns a camera frame or photo into one e-District-ready page image.
// e-District accepts at most 100 KB per page, so true lossless isn't possible
// for photos. Instead: keep the HIGHEST JPEG quality that fits, and only
// shrink the image if even the lowest acceptable quality is too big. A4 at
// ~200 DPI (1654 px long side) keeps printed text sharp.

export const PAGE_LIMIT_BYTES = 100 * 1024;
export const MAX_PAGES = 10; // e-District: 10 pages per file
const MAX_SIDE = 1654;
const Q_MAX = 0.95;
const Q_MIN = 0.55; // below this text edges get blocky; shrink instead

export interface ScannedPage {
  jpeg: Uint8Array;
  width: number;
  height: number;
  quality: number;
  /** Object URL for previews; revoke when the page is discarded. */
  url: string;
}

const toJpeg = (c: HTMLCanvasElement, q: number) =>
  new Promise<Blob>((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error("encode failed"))), "image/jpeg", q));

export async function compressPage(source: CanvasImageSource, srcW: number, srcH: number): Promise<ScannedPage> {
  let scale = Math.min(1, MAX_SIDE / Math.max(srcW, srcH));
  for (let attempt = 0; attempt < 8; attempt++) {
    const w = Math.round(srcW * scale);
    const h = Math.round(srcH * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, w, h);

    // Binary search for the highest quality under the limit.
    let best: Blob | null = null;
    let bestQ = 0;
    const top = await toJpeg(canvas, Q_MAX);
    if (top.size <= PAGE_LIMIT_BYTES) {
      best = top;
      bestQ = Q_MAX;
    } else {
      let lo = Q_MIN;
      let hi = Q_MAX;
      for (let i = 0; i < 6; i++) {
        const q = (lo + hi) / 2;
        const b = await toJpeg(canvas, q);
        if (b.size <= PAGE_LIMIT_BYTES) {
          best = b;
          bestQ = q;
          lo = q;
        } else hi = q;
      }
    }
    if (best) {
      return { jpeg: new Uint8Array(await best.arrayBuffer()), width: w, height: h, quality: bestQ, url: URL.createObjectURL(best) };
    }
    scale *= 0.85; // still too big at the lowest good quality: fewer pixels, same quality
  }
  throw new Error("Could not fit the page under 100 KB");
}

/** A photo picked from the phone's camera app or gallery. */
export async function compressFile(file: File): Promise<ScannedPage> {
  const bmp = await createImageBitmap(file); // honours EXIF rotation in Chrome
  try {
    return await compressPage(bmp, bmp.width, bmp.height);
  } finally {
    bmp.close();
  }
}

export const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;
