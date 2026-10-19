import React, { useEffect, useState } from "react";
import { modules, defaults } from "../services/modules";
import { api } from "../services/api";
import { ErrorBox, Loading } from "./Common";
export default function RecordForm({
  module,
  record,
  user,
  onSaved,
  onCancel,
}) {
  const narrow = module === "tasks" && user.role_id === "engineer" && record;
  const fields = narrow
    ? modules.tasks.fields.filter((f) => ["status", "progress"].includes(f.key))
    : modules[module].fields;
  const [form, setForm] = useState(() => {
      const initial = defaults(module, user);
      if (record)
        for (const f of fields) {
          let value = record[f.key];
          if (f.type === "checkbox") value = !!value;
          if (f.type === "datetime-local" && value) {
            const d = new Date(value.replace(" ", "T") + "Z");
            value = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16);
          }
          initial[f.key] = value ?? initial[f.key];
        }
      return initial;
    }),
    [lookups, setLookups] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    Promise.all([
      !narrow && user.permissions.includes("team.read")
        ? api("/team")
        : Promise.resolve({ data: [{ ...user, active: true }] }),
      !narrow && user.permissions.includes("customers.read")
        ? api("/customers?limit=100")
        : Promise.resolve({ data: [] }),
      !narrow && user.permissions.includes("projects.read")
        ? api("/projects?limit=100")
        : Promise.resolve({ data: [] }),
    ])
      .then(([team, customers, projects]) =>
        setLookups({
          user: team.data.filter((u) => u.active),
          multiuser: team.data.filter((u) => u.active),
          customers: customers.data,
          projects: projects.data,
        }),
      )
      .catch((e) => setError(e.message));
  }, [user]);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {};
      for (const f of fields) {
        let v = form[f.key];
        if (f.type === "number") v = Number(v);
        if (f.type === "datetime-local")
          v = v ? new Date(v).toISOString() : null;
        if (f.type === "date") v = v || null;
        if (["customers", "projects"].includes(f.type)) v = v || null;
        payload[f.key] = v;
      }
      await api(`/${module}${record ? "/" + record.id : ""}`, {
        method: record ? "PATCH" : "POST",
        body: payload,
      });
      await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!lookups && !error) return <Loading />;
  return (
    <form onSubmit={submit}>
      <ErrorBox message={error} />
      <div className="form-grid">
        {fields.map((f) => (
          <label
            key={f.key}
            className={
              ["textarea", "multiuser"].includes(f.type)
                ? "full"
                : f.type === "checkbox"
                  ? "checkbox-label full"
                  : ""
            }
          >
            {f.type === "checkbox" ? (
              <>
                <input
                  type="checkbox"
                  checked={!!form[f.key]}
                  onChange={(e) =>
                    setForm({ ...form, [f.key]: e.target.checked })
                  }
                />
                {f.label}
              </>
            ) : (
              <>
                {f.label}
                {f.type === "textarea" ? (
                  <textarea
                    rows={3}
                    maxLength={10000}
                    value={form[f.key] || ""}
                    onChange={(e) =>
                      setForm({ ...form, [f.key]: e.target.value })
                    }
                  />
                ) : f.type === "multiuser" ? (
                  <div className="member-options">
                    {lookups?.multiuser.map((u) => (
                      <label className="checkbox-label" key={u.id}>
                        <input
                          type="checkbox"
                          checked={(form[f.key] || []).includes(u.id)}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              [f.key]: e.target.checked
                                ? [...(form[f.key] || []), u.id]
                                : (form[f.key] || []).filter((v) => v !== u.id),
                            })
                          }
                        />
                        {u.name}
                      </label>
                    ))}
                  </div>
                ) : f.type === "select" || lookups?.[f.type] ? (
                  <select
                    aria-label={f.label}
                    required={f.type === "user"}
                    value={form[f.key] || ""}
                    onChange={(e) =>
                      setForm({ ...form, [f.key]: e.target.value })
                    }
                  >
                    {f.type !== "select" && (
                      <option value="">
                        {f.type === "user" ? "Select team member" : "None"}
                      </option>
                    )}
                    {f.type === "select"
                      ? f.options.map((v) => <option key={v}>{v}</option>)
                      : lookups[f.type].map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    required={[
                      "name",
                      "message",
                      "starts_at",
                      "ends_at",
                      "currency",
                    ].includes(f.key)}
                    min={f.type === "number" ? 0 : undefined}
                    max={f.key === "progress" ? 100 : undefined}
                    step={f.key === "value" ? "0.01" : undefined}
                    maxLength={f.key === "currency" ? 3 : undefined}
                    value={form[f.key] ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, [f.key]: e.target.value })
                    }
                  />
                )}
              </>
            )}
          </label>
        ))}
      </div>
      <div className="form-footer">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary" disabled={busy || !lookups}>
          {busy
            ? "Saving…"
            : record
              ? "Save changes"
              : `Create ${modules[module].singular}`}
        </button>
      </div>
    </form>
  );
}
