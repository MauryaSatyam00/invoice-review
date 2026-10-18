interface Props {
  busy: boolean;
  hasDoc: boolean;
  drawMode: boolean;
  error: string;
  onUpload: (file?: File) => void;
  onToggleDraw: () => void;
}

export default function Header({ busy, hasDoc, drawMode, error, onUpload, onToggleDraw }: Props) {
  return (
    <header>
      <h1>Invoice field review</h1>
      <label className="upload">
        {busy ? "Reading…" : "Upload PDF / image"}
        <input type="file" accept="application/pdf,image/*" hidden onChange={(e) => onUpload(e.target.files?.[0])} />
      </label>
      <button disabled={!hasDoc} className={drawMode ? "on" : ""} onClick={onToggleDraw}>
        {drawMode ? "Drag on document… (click to cancel)" : "+ Draw new field"}
      </button>
      {error && <span className="err">{error}</span>}
    </header>
  );
}