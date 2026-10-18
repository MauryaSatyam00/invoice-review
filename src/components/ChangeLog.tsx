import type { LogEntry } from "../types";

export default function ChangeLog({ log }: { log: LogEntry[] }) {
  return (
    <>
      <h2>Change log</h2>
      {!log.length ? (
        <p className="muted">No changes yet.</p>
      ) : (
        <table className="log">
          <thead>
            <tr><th>Time</th><th>Field</th><th>Old</th><th>New</th></tr>
          </thead>
          <tbody>
            {log.map((l) => (
              <tr key={l.id}>
                <td>{new Date(l.at).toLocaleString()}</td>
                <td>{l.field}{l.kind !== "edit" && <em> ({l.kind})</em>}</td>
                <td>{l.kind === "approve" ? "—" : l.oldValue || "—"}</td>
                <td>{l.kind === "approve" ? "approved" : l.newValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}