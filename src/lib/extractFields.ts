
import Tesseract from "tesseract.js";
import { DOC_W, type BBox, type Field, type PageImg, type Token } from "../types";

interface Span { start: number; end: number; t: Token }
interface Line { page: number; y: number; text: string; spans: Span[] }
interface Hit { value: string; bbox: BBox; page: number }
interface OcrWord { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }

/* ---------- 1. get tokens (PDF text layer, or OCR for images / scanned PDFs) ---------- */

async function ocrPage(p: PageImg, page: number): Promise<Token[]> {
  const { data } = await Tesseract.recognize(p.src, "eng") as { data: { words: OcrWord[] } };
  const k = DOC_W / p.pxW;
  return data.words
    .filter((w) => w.text.trim())
    .map((w) => ({
      text: w.text.trim(),
      page,
      bbox: [w.bbox.x0 * k, w.bbox.y0 * k, w.bbox.x1 * k, w.bbox.y1 * k] as BBox,
    }));
}

/* ---------- 2. group tokens into visual lines ---------- */

function buildLines(tokens: Token[]): Line[] {
  const lines: Line[] = [];
  const pages = [...new Set(tokens.map((t) => t.page))];
  for (const page of pages) {
    const yc = (t: Token) => (t.bbox[1] + t.bbox[3]) / 2;
    const sorted = tokens.filter((t) => t.page === page).sort((a, b) => yc(a) - yc(b));
    const groups: Token[][] = [];
    for (const t of sorted) {
      const last = groups[groups.length - 1];
      const h = t.bbox[3] - t.bbox[1];
      if (last && Math.abs(yc(t) - yc(last[0])) < h * 0.6) last.push(t);
      else groups.push([t]);
    }
    for (const g of groups) {
      g.sort((a, b) => a.bbox[0] - b.bbox[0]);
      let text = "";
      const spans: Span[] = [];
      for (const t of g) {
        spans.push({ start: text.length, end: text.length + t.text.length, t });
        text += t.text + " ";
      }
      lines.push({ page, y: yc(g[0]), text, spans });
    }
  }
  return lines;
}

/** Box around chars [s, e) of a line, interpolating inside tokens that hold several words. */
function hit(line: Line, s: number, e: number): Hit | null {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const { start, end, t } of line.spans) {
    const a = Math.max(s, start), b = Math.min(e, end);
    if (a >= b) continue;
    const w = t.bbox[2] - t.bbox[0], len = end - start;
    x1 = Math.min(x1, t.bbox[0] + (w * (a - start)) / len);
    x2 = Math.max(x2, t.bbox[0] + (w * (b - start)) / len);
    y1 = Math.min(y1, t.bbox[1]);
    y2 = Math.max(y2, t.bbox[3]);
  }
  if (x1 === Infinity) return null;
  const pad = 2;
  return {
    value: line.text.slice(s, e),
    page: line.page,
    bbox: [x1 - pad, y1 - pad, x2 + pad, y2 + pad].map(Math.round) as BBox,
  };
}

/* ---------- 3. field finders ---------- */

const INV = /(?:invoice|inv|bill)\s*(?:no\.?|number|num|#)?\s*[:#.\-]?\s*((?=[A-Z0-9\-/]*\d)[A-Z0-9][A-Z0-9\-/]{2,})/id;
const INV_LOOSE = /\bINV[-\s]?\d[\w-]*/id;
const DATE_ONLY = /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/;

function findInvoiceNumber(lines: Line[]): Hit | null {
  for (const l of lines) {
    const m = INV.exec(l.text);
    const idx = m?.indices?.[1];
    if (m && idx && !DATE_ONLY.test(m[1])) return hit(l, idx[0], idx[1]);
  }
  for (const l of lines) {
    const idx = INV_LOOSE.exec(l.text)?.indices?.[0];
    if (idx) return hit(l, idx[0], idx[1]);
  }
  return null;
}

const MON = "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec";
const DATE = new RegExp(
  `\\b(\\d{4}-\\d{2}-\\d{2}|\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{2,4}|\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MON})[a-z]*\\.?,?\\s+\\d{4}|(?:${MON})[a-z]*\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4})\\b`,
  "id",
);

function findDate(lines: Line[]): Hit | null {
  let best: { score: number; line: Line; s: number; e: number } | null = null;
  for (const l of lines) {
    const idx = DATE.exec(l.text)?.indices?.[1];
    if (!idx) continue;
    let score = 0;
    if (/date/i.test(l.text) && !/due|deliver|ship/i.test(l.text)) score += 2;
    if (/due/i.test(l.text)) score -= 2;
    if (!best || score > best.score) best = { score, line: l, s: idx[0], e: idx[1] };
  }
  return best && hit(best.line, best.s, best.e);
}

const AMT = /(?:₹|Rs\.?|INR|USD|\$|€|£)?\s*(\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+\.\d{2})/dg;

function totalScore(text: string): number {
  if (/grand\s*total|total\s*(amount|due|payable)|amount\s*(due|payable)|balance\s*due|net\s*payable/i.test(text)) return 3;
  if (/\btotal\b/i.test(text) && !/sub|tax|gst|vat|discount/i.test(text)) return 2;
  return 0;
}

function findTotal(lines: Line[]): Hit | null {
  let best: { score: number; line: Line; s: number; e: number } | null = null;
  for (const l of lines) {
    const score = totalScore(l.text);
    if (!score) continue;
    const idx = [...l.text.matchAll(AMT)].pop()?.indices?.[1];
    if (!idx) continue;
    // higher score wins; on ties prefer the one lowest in the document
    const later = best && (l.page > best.line.page || (l.page === best.line.page && l.y > best.line.y));
    if (!best || score > best.score || (score === best.score && later)) best = { score, line: l, s: idx[0], e: idx[1] };
  }
  return best && hit(best.line, best.s, best.e);
}

/* ---------- 4. public API ---------- */

const FINDERS: [name: string, find: (l: Line[]) => Hit | null][] = [
  ["invoicenumber", findInvoiceNumber],
  ["date", findDate],
  ["totalamount", findTotal],
];

export async function extractFields(pages: PageImg[], pdfTokens: Token[]): Promise<{ fields: Field[]; missing: string[] }> {
  const tokens = [...pdfTokens];
  for (let i = 0; i < pages.length; i++) {
    if (!pdfTokens.some((t) => t.page === i + 1)) tokens.push(...(await ocrPage(pages[i], i + 1)));
  }
  const lines = buildLines(tokens);
  const fields: Field[] = [];
  const missing: string[] = [];
  for (const [name, find] of FINDERS) {
    const h = find(lines);
    if (h) fields.push({ id: `auto-${name}`, field: name, value: h.value, page: h.page, bbox: h.bbox, status: "pending" });
    else missing.push(name);
  }
  return { fields, missing };
}
