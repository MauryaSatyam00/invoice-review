import type { Field } from "../types";
import FieldRow from "./FieldRow";

interface Props {
  fields: Field[];
  missing: string[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSave: (f: Field, value: string) => void;
  onApprove: (f: Field) => void;
}

export default function FieldPanel({ fields, missing, selectedId, onSelect, onSave, onApprove }: Props) {
  return (
    <>
      <h2>Extracted fields</h2>
      {!fields.length && !missing.length && <p className="muted">Upload a document to detect fields.</p>}
      {!!fields.length && (
        <ul className="fields">
          {fields.map((f) => (
            <FieldRow
              key={`${f.id}-${f.value}`}
              field={f}
              selected={f.id === selectedId}
              onSelect={() => onSelect(f.id)}
              onSave={(v) => onSave(f, v)}
              onApprove={() => onApprove(f)}
            />
          ))}
        </ul>
      )}
      {!!missing.length && (
        <p className="note">
          Couldn't find: <strong>{missing.join(", ")}</strong>. Use “+ Draw new field” to add {missing.length > 1 ? "them" : "it"} manually.
        </p>
      )}
    </>
  );
}