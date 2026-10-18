import { useState } from "react";
import type { Field } from "../types";

interface Props {
  field: Field;
  selected: boolean;
  onSelect: () => void;
  onSave: (value: string) => void;
  onApprove: () => void;
}

export default function FieldRow({ field: f, selected, onSelect, onSave, onApprove }: Props) {
  const [draft, setDraft] = useState(f.value);
  const dirty = draft !== f.value;
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

  return (
    <li className={`row ${selected ? "sel" : ""}`} onClick={onSelect}>
      <div className="row-top">
        <strong>{f.field}</strong>
        <span className={`badge ${f.status}`}>{f.status}</span>
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        aria-label={`${f.field} value`}
      />
      <div className="row-actions">
        <button disabled={!dirty} onClick={stop(() => onSave(draft))}>Save edit</button>
        <button disabled={dirty || f.status === "approved"} onClick={stop(onApprove)}>Approve</button>
        {dirty && <button onClick={stop(() => setDraft(f.value))}>Reset</button>}
      </div>
    </li>
  );
}