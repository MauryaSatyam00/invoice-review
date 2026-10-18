import type { BBox } from "../types";

export const MOCK = [
  { field: "invoicenumber", value: "INV-2041", page: 1, bbox: [120, 80, 260, 100] },
  { field: "date", value: "2026-09-14", page: 1, bbox: [400, 80, 520, 100] },
  { field: "totalamount", value: "48,250.00", page: 1, bbox: [400, 620, 520, 645] },
] as { field: string; value: string; page: number; bbox: BBox }[];