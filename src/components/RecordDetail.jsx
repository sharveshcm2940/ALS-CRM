import React, { useEffect, useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { api } from "../services/api";
import { modules } from "../services/modules";
import { Badge, DateText, ErrorBox } from "./Common";
export default function RecordDetail({
  module,
  record,
  user,
  timezone,
  onEdit,
  onArchive,
  onConvert,
  onUpdated,
}) {
  const [currentRecord, setCurrentRecord] = useState(record);
  const [comments, setComments] = useState([]),
    [body, setBody] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [team, setTeam] = useState([]),
    [customers, setCustomers] = useState([]),
    [projects, setProjects] = useState([]),
    [history, setHistory] = useState([]);
  const canEdit =
    user.permissions.includes(`${module}.write`) ||
    (module === "tasks" && user.role_id === "engineer");
  async function refresh() {
    try {
      setComments((await api(`/${module}/${record.id}/comments`)).data);
      setHistory((await api(`/${module}/${record.id}/activity`)).data);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    refresh();
    if (user.permissions.includes("team.read"))
      api("/team")
        .then((r) => setTeam(r.data))
        .catch((e) => setError(e.message));
    if (user.permissions.includes("customers.read"))
      api("/customers?limit=100")
        .then((r) => setCustomers(r.data))
        .catch(() => {});
    if (user.permissions.includes("projects.read"))
      api("/projects?limit=100")
        .then((r) => setProjects(r.data))
        .catch(() => {});
  }, [record.id]);
  async function comment(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/${module}/${record.id}/comments`, {
        method: "POST",
        body: { body },
      });
      setBody("");
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="detail-content">
      <ErrorBox message={error} />
      <div className="detail-actions">
        {canEdit && (
          <button className="primary" onClick={onEdit}>
            {module === "tasks" && user.role_id === "engineer"
              ? "Update progress"
              : "Edit record"}
          </button>
        )}
        {module === "tasks" && canEdit && (
          <button
            type="button"
            className={
              currentRecord.status === "Completed"
                ? "button"
                : "button primary-success"
            }
            onClick={async () => {
              const isDone = currentRecord.status === "Completed";
              const nextStatus = isDone ? "In Progress" : "Completed";
              const nextProgress = isDone ? 50 : 100;
              try {
                const res = await api(`/tasks/${currentRecord.id}`, {
                  method: "PATCH",
                  body: { status: nextStatus, progress: nextProgress },
                });
                setCurrentRecord((prev) => ({
                  ...prev,
                  status: nextStatus,
                  progress: nextProgress,
                }));
                await refresh();
                if (onUpdated) onUpdated(res.data);
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            {currentRecord.status === "Completed" ? (
              <>
                <RotateCcw size={15} /> Reopen Task
              </>
            ) : (
              <>
                <CheckCircle2 size={15} /> Mark as Completed
              </>
            )}
          </button>
        )}
        {module === "leads" &&
          !record.converted_customer_id &&
          user.permissions.includes("leads.write") &&
          user.permissions.includes("customers.write") && (
            <button onClick={onConvert}>Convert to customer</button>
          )}
        {user.permissions.includes(`${module}.archive`) && (
          <button className="danger" onClick={onArchive}>
            Archive
          </button>
        )}
      </div>
      <dl className="detail-grid">
        {modules[module].fields.map((f) => (
          <div key={f.key} className={f.type === "textarea" ? "full" : ""}>
            <dt>{f.label}</dt>
            <dd>
              {f.type === "user" ? (
                team.find((u) => u.id === currentRecord[f.key])?.name || "—"
              ) : f.type === "multiuser" ? (
                currentRecord[f.key]
                  ?.map(
                    (id) =>
                      team.find((u) => u.id === id)?.name || "Team member",
                  )
                  .join(", ") || "None"
              ) : f.type === "customers" ? (
                currentRecord[f.key] ? (
                  customers.find((c) => c.id === currentRecord[f.key])?.name ||
                  "Linked customer"
                ) : (
                  "None"
                )
              ) : f.type === "projects" ? (
                currentRecord[f.key] ? (
                  projects.find((p) => p.id === currentRecord[f.key])?.name ||
                  "Linked project"
                ) : (
                  "None"
                )
              ) : f.type === "checkbox" ? (
                currentRecord[f.key] ? (
                  "Yes"
                ) : (
                  "No"
                )
              ) : f.type === "date" || f.type === "datetime-local" ? (
                <DateText
                  value={currentRecord[f.key]}
                  timezone={timezone}
                  time={f.type === "datetime-local"}
                />
              ) : ["status", "priority", "audience"].includes(f.key) ? (
                <Badge value={currentRecord[f.key]} />
              ) : (
                String(currentRecord[f.key] ?? "—") || "—"
              )}
            </dd>
          </div>
        ))}
      </dl>
      <div className="comments">
        <h3>Conversation & work updates</h3>
        {comments.length ? (
          comments.map((c) => (
            <div className="comment" key={c.id}>
              <div>
                <strong>{c.name}</strong>
                <small>
                  <DateText value={c.created_at} timezone={timezone} time />
                </small>
              </div>
              <p>{c.body}</p>
            </div>
          ))
        ) : (
          <p className="muted">No comments yet.</p>
        )}
        {user.permissions.includes("comments.write") && (
          <form onSubmit={comment}>
            <label className="sr-only" htmlFor="comment">
              Add a comment
            </label>
            <textarea
              id="comment"
              required
              maxLength={5000}
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share an update or add a comment…"
            />
            <button className="primary" disabled={busy}>
              Post comment
            </button>
          </form>
        )}
      </div>
      <div className="comments">
        <h3>Record history</h3>
        {history.map((a) => (
          <div className="comment" key={a.id}>
            <p>
              <strong>{a.actor_name || "System"}</strong> · {a.summary}
            </p>
            <small>
              <DateText value={a.created_at} timezone={timezone} time />
            </small>
          </div>
        ))}
      </div>
    </div>
  );
}
