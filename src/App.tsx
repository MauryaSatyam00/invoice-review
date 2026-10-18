import { useRef, useState } from "react";
import type { BBox, Field, LogEntry, PageImg } from "./types";
import { loadDocument } from "./lib/loadDocument";
import { extractFields } from "./lib/extractFields";
import Header from "./components/Header";
import DocumentViewer from "./components/DocumentViewer";
import FieldPanel from "./components/FieldPanel";
import ChangeLog from "./components/ChangeLog";
import "./App.css";

export default function App() {
  const [pages, setPages] = useState<PageImg[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const logId = useRef(0);
  const manualN = useRef(1);

  const addLog = (e: Omit<LogEntry, "id" | "at">) =>
    setLog((l) => [{ ...e, id: ++logId.current, at: new Date().toISOString() }, ...l]);

  const patchField = (id: string, patch: Partial<Field>) =>
    setFields((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  async function handleUpload(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      setFields([]);
      setMissing([]);
      const doc = await loadDocument(file);
      setPages(doc.pages); // show the document right away
      const result = await extractFields(doc.pages, doc.tokens);
      setFields(result.fields);
      setMissing(result.missing);
      setLog([]);
      setSelectedId(null);
    } catch {
      setError("Could not read that file. Try a PDF, PNG or JPG.");
    } finally {
      setBusy(false);
    }
  }

  function handleSave(f: Field, value: string) {
    addLog({ field: f.field, kind: "edit", oldValue: f.value, newValue: value });
    patchField(f.id, { value, status: "edited" });
  }

  function handleApprove(f: Field) {
    addLog({ field: f.field, kind: "approve", oldValue: f.value, newValue: f.value });
    patchField(f.id, { status: "approved" });
  }

  function handleDrawn(page: number, bbox: BBox) {
    const name = `custom_field_${manualN.current++}`;
    const f: Field = { id: `m-${Date.now()}`, field: name, value: "", page, bbox, status: "pending", manual: true };
    setFields((fs) => [...fs, f]);
    setSelectedId(f.id);
    addLog({ field: name, kind: "add", oldValue: "", newValue: `bbox [${bbox.join(", ")}]` });
    setDrawMode(false);
  }

  return (
    <div className="app">
      <Header
        busy={busy}
        hasDoc={pages.length > 0}
        drawMode={drawMode}
        error={error}
        onUpload={handleUpload}
        onToggleDraw={() => setDrawMode((d) => !d)}
      />
      <main>
        <DocumentViewer pages={pages} fields={fields} selectedId={selectedId} drawMode={drawMode} onDrawn={handleDrawn} />
        <aside>
          <FieldPanel fields={fields} missing={missing} selectedId={selectedId} onSelect={setSelectedId} onSave={handleSave} onApprove={handleApprove} />
          <ChangeLog log={log} />
        </aside>
      </main>
    </div>
  );
}