import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  RotateCcw,
  FileText,
  PhoneCall,
  Users,
  Mail,
  Milestone,
} from "lucide-react";
import { api } from "../services/api";
import { modules } from "../services/modules";
import { Badge, DateText, ErrorBox } from "./Common";

const activityTypes = [
  { id: "note", label: "Note", icon: FileText, tag: "" },
  { id: "call", label: "Call Log", icon: PhoneCall, tag: "[Call Log]" },
  { id: "meeting", label: "Meeting", icon: Users, tag: "[Meeting Note]" },
  { id: "email", label: "Email", icon: Mail, tag: "[Email Log]" },
  { id: "milestone", label: "Milestone", icon: Milestone, tag: "[Milestone]" },
];

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
    [selectedActivity, setSelectedActivity] = useState("note"),
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
      const activeType = activityTypes.find((t) => t.id === selectedActivity);
      const finalBody = activeType?.tag ? `${activeType.tag} ${body}` : body;
      await api(`/${module}/${record.id}/comments`, {
        method: "POST",
        body: { body: finalBody },
      });
      setBody("");
      setSelectedActivity("note");
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
        <h3>Activity & Timeline Updates</h3>
        {comments.length ? (
          comments.map((c) => {
            const matchedType = activityTypes.find(
              (t) => t.tag && c.body.startsWith(t.tag),
            );
            const cleanBody = matchedType
              ? c.body.replace(matchedType.tag, "").trim()
              : c.body;
            const Icon = matchedType?.icon || FileText;

            return (
              <div className="comment" key={c.id}>
                <div className="comment-header-row">
                  <div className="comment-author-info">
                    <strong>{c.name}</strong>
                    {matchedType && (
                      <span className={`activity-type-badge ${matchedType.id}`}>
                        <Icon size={12} />
                        <span>{matchedType.label}</span>
                      </span>
                    )}
                  </div>
                  <small>
                    <DateText value={c.created_at} timezone={timezone} time />
                  </small>
                </div>
                <p>{cleanBody}</p>
              </div>
            );
          })
        ) : (
          <p className="muted">No activity or comments recorded yet.</p>
        )}

        {user.permissions.includes("comments.write") && (
          <form className="activity-logger-form" onSubmit={comment}>
            <div className="activity-type-chips">
              <span className="activity-type-label">Log Activity:</span>
              {activityTypes.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    type="button"
                    key={t.id}
                    className={`activity-chip-btn ${selectedActivity === t.id ? "active" : ""}`}
                    onClick={() => setSelectedActivity(t.id)}
                  >
                    <Icon size={13} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            <label className="sr-only" htmlFor="comment">
              Add note or activity update
            </label>
            <textarea
              id="comment"
              required
              maxLength={5000}
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={
                selectedActivity === "call"
                  ? "Log phone call outcome, follow-up items, or client discussion…"
                  : selectedActivity === "meeting"
                    ? "Log meeting summary, agreed action points, and key decisions…"
                    : selectedActivity === "email"
                      ? "Log email correspondence summary, notes, or next steps…"
                      : selectedActivity === "milestone"
                        ? "Log project milestone achieved, deliverables met, or progress…"
                        : "Share an internal note or progress update…"
              }
            />
            <button className="primary" disabled={busy}>
              {busy ? "Posting…" : "Post update"}
            </button>
          </form>
        )}
      </div>
      <div className="comments">
        <h3>Record audit history</h3>
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
