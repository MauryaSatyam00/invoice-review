import { useState } from "react";
import { DOC_W, type BBox, type Field, type PageImg } from "../types";

interface Props {
  page: PageImg;
  pageNo: number;
  fields: Field[]; // fields detected on this page
  selectedId: string | null;
  drawMode: boolean;
  onDrawn: (pageNo: number, bbox: BBox) => void;
}

interface Drag { x0: number; y0: number; x1: number; y1: number }

/** One document page: the image, a highlight per detected field, and drag-to-draw. */
export default function PageView({ page, pageNo, fields, selectedId, drawMode, onDrawn }: Props) {
  const [drag, setDrag] = useState<Drag | null>(null);

  const toDoc = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * DOC_W, y: ((e.clientY - r.top) / r.height) * page.h };
  };

  function finish() {
    if (!drag) return;
    const x1 = Math.round(Math.min(drag.x0, drag.x1)), x2 = Math.round(Math.max(drag.x0, drag.x1));
    const y1 = Math.round(Math.min(drag.y0, drag.y1)), y2 = Math.round(Math.max(drag.y0, drag.y1));
    if (x2 - x1 > 6 && y2 - y1 > 6) onDrawn(pageNo, [x1, y1, x2, y2]);
    setDrag(null);
  }

  return (
    <div
      className={`page ${drawMode ? "draw" : ""}`}
      style={{ width: DOC_W, height: page.h }}
      onMouseDown={(e) => { if (drawMode) { const { x, y } = toDoc(e); setDrag({ x0: x, y0: y, x1: x, y1: y }); } }}
      onMouseMove={(e) => { if (drag) { const { x, y } = toDoc(e); setDrag({ ...drag, x1: x, y1: y }); } }}
      onMouseUp={finish}
      onMouseLeave={finish}
    >
      <img src={page.src} width={DOC_W} height={page.h} draggable={false} alt={`Page ${pageNo}`} />

      {fields.map((f) => (
        <div
          key={f.id}
          className={`hl ${f.id === selectedId ? "active" : ""}`}
          style={{ left: f.bbox[0], top: f.bbox[1], width: f.bbox[2] - f.bbox[0], height: f.bbox[3] - f.bbox[1] }}
        >
          <span>{f.field}</span>
        </div>
      ))}

      {drag && (
        <div
          className="hl ghost"
          style={{
            left: Math.min(drag.x0, drag.x1), top: Math.min(drag.y0, drag.y1),
            width: Math.abs(drag.x1 - drag.x0), height: Math.abs(drag.y1 - drag.y0),
          }}
        />
      )}
    </div>
  );
}