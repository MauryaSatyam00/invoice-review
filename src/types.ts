/** All bboxes live in a fixed "document space": every page is rendered 595px wide (A4 @ 72dpi). */
export const DOC_W = 595;

export type BBox = [number, number, number, number]; // x1, y1, x2, y2
export type Status = "pending" | "approved" | "edited";

export interface Field {
  id: string;
  field: string;
  value: string;
  page: number;
  bbox: BBox;
  status: Status;
  manual?: boolean;
}

export interface LogEntry {
  id: number;
  field: string;
  kind: "edit" | "approve" | "add";
  oldValue: string;
  newValue: string;
  at: string;
}

export interface PageImg {
  src: string;
  h: number; // display height in document space
  pxW: number; // pixel width of `src` (needed to map OCR coordinates)
}

/** A piece of text on a page with its position, from the PDF text layer or OCR. */
export interface Token {
  text: string;
  page: number;
  bbox: BBox;
}