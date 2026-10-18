import type { BBox, Field, PageImg } from "../types";
import PageView from "./PageView";

interface Props {
  pages: PageImg[];
  fields: Field[];
  selectedId: string | null;
  drawMode: boolean;
  onDrawn: (pageNo: number, bbox: BBox) => void;
}

export default function DocumentViewer({ pages, fields, selectedId, drawMode, onDrawn }: Props) {
  if (!pages.length) {
    return <section className="doc"><p className="empty">Upload an invoice or bill to begin.</p></section>;
  }
  return (
    <section className="doc">
      {pages.map((p, i) => (
        <PageView
          key={i}
          page={p}
          pageNo={i + 1}
          fields={fields.filter((f) => f.page === i + 1)}
          selectedId={selectedId}
          drawMode={drawMode}
          onDrawn={onDrawn}
        />
      ))}
    </section>
  );
}