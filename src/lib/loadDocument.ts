import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { DOC_W, type PageImg, type Token } from "../types";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/** Turns a PDF or image into page images (DOC_W wide) plus any text the PDF itself contains. */
export async function loadDocument(file: File): Promise<{ pages: PageImg[]; tokens: Token[] }> {
  const url = URL.createObjectURL(file);

  if (file.type.startsWith("image/")) {
    const img = new Image();
    img.src = url;
    await img.decode();
    const h = Math.round((img.naturalHeight / img.naturalWidth) * DOC_W);
    return { pages: [{ src: url, h, pxW: img.naturalWidth }], tokens: [] };
  }

  const pdf = await pdfjs.getDocument(url).promise;
  const pages: PageImg[] = [];
  const tokens: Token[] = [];
  const measure = document.createElement("canvas").getContext("2d")!;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const s = DOC_W / base.width;

    // render the page image at 2x for sharpness
    const vp = page.getViewport({ scale: s * 2 });
    const canvas = document.createElement("canvas");
    canvas.width = vp.width;
    canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
    pages.push({ src: canvas.toDataURL("image/png"), h: Math.round(vp.height / 2), pxW: vp.width });

    // text layer -> one token per WORD, in document space.
    // pdf.js gives whole phrases per item, so we measure with the real font to place each word precisely.
    const docVp = page.getViewport({ scale: s });
    const content = await page.getTextContent();
    for (const it of content.items) {
      if (!("str" in it) || !it.str.trim()) continue;
      const [, , , , tx, ty] = pdfjs.Util.transform(docVp.transform, it.transform);
      const h = (it.height || Math.abs(it.transform[3])) * s;
      const fontSize = Math.abs(it.transform[3]) * s || 10;
      measure.font = `${fontSize}px ${content.styles[it.fontName]?.fontFamily ?? "sans-serif"}`;
      const k = (it.width * s) / (measure.measureText(it.str).width || 1); // normalise to the PDF's real width
      for (const m of it.str.matchAll(/\S+/g)) {
        const a = m.index ?? 0;
        const x1 = tx + measure.measureText(it.str.slice(0, a)).width * k;
        const x2 = tx + measure.measureText(it.str.slice(0, a + m[0].length)).width * k;
        tokens.push({ text: m[0], page: i, bbox: [x1, ty - h, x2, ty + h * 0.25] });
      }
    }
  }
  return { pages, tokens };
}