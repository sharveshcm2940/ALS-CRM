import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../services/api";
import {
  PageHeader,
  ErrorBox,
  Loading,
  DateText,
  Pagination,
} from "../components/Common";
export default function Settings({ onSettingsChanged, onLogout }) {
  const { user, settings } = useOutletContext();
  const [tab, setTab] = useState("account"),
    [form, setForm] = useState(settings),
    [password, setPassword] = useState({
      currentPassword: "",
      newPassword: "",
    }),
    [permissionData, setPermissionData] = useState(null),
    [role, setRole] = useState("board"),
    [grants, setGrants] = useState([]),
    [logs, setLogs] = useState(null),
    [meta, setMeta] = useState(null),
    [page, setPage] = useState(1),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const admin = user.role_id === "ceo";
  useEffect(() => {
    if (tab === "permissions") {
      api("/permissions")
        .then((r) => {
          setPermissionData(r.data);
          setGrants(
            r.data.grants
              .filter((g) => g.role_id === role)
              .map((g) => g.permission_id),
          );
        })
        .catch((e) => setError(e.message));
    }
    if (tab === "audit")
      api(`/audit?page=${page}`)
        .then((r) => {
          setLogs(r.data);
          setMeta({ ...r.meta, limit: 30 });
        })
        .catch((e) => setError(e.message));
  }, [tab, role, page]);
  async function save(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (tab === "account") {
        await api("/auth/change-password", { method: "PATCH", body: password });
        await onLogout();
        return;
      }
      if (tab === "company") {
        await api("/settings", { method: "PATCH", body: form });
        await onSettingsChanged();
      }
      if (tab === "permissions") {
        await api(`/permissions/${role}`, { method: "PUT", body: { grants } });
      }
      setNotice("Settings saved.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Settings"
        description="Your account, company preferences, and workspace access."
      />
      <div className="tabs">
        {[
          ["account", "My account"],
          ...(admin
            ? [
                ["company", "Company"],
                ["permissions", "Permissions"],
                ["audit", "Audit log"],
              ]
            : []),
        ].map(([id, label]) => (
          <button
            className={tab === id ? "active" : ""}
            key={id}
            onClick={() => {
              setTab(id);
              setError("");
              setNotice("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <ErrorBox message={error} />
      {notice && (
        <div className="success" role="status">
          {notice}
        </div>
      )}
      <section className="panel settings-panel">
        {tab === "audit" ? (
          <>
            <div className="panel-heading">
              <div>
                <h2>Audit history</h2>
                <p>Administrative actions, sessions, and record changes</p>
              </div>
            </div>
            {!logs ? (
              <Loading />
            ) : (
              <>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Actor</th>
                        <th>Action</th>
                        <th>Summary</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((l) => (
                        <tr key={l.id}>
                          <td>{l.actor_name || "System"}</td>
                          <td>{l.action}</td>
                          <td>{l.summary}</td>
                          <td>
                            <DateText
                              value={l.created_at}
                              timezone={settings.timezone}
                              time
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination meta={meta} onPage={setPage} />
              </>
            )}
          </>
        ) : (
          <form onSubmit={save}>
            <div className="panel-heading">
              <div>
                <h2>
                  {tab === "account"
                    ? "Account & security"
                    : tab === "company"
                      ? "Company preferences"
                      : "Role permissions"}
                </h2>
                <p>
                  {tab === "account"
                    ? `${user.name} · ${user.username}`
                    : tab === "company"
                      ? "Dates and meeting times use the company timezone."
                      : "Administrative permissions are reserved for the CEO. Record-level access rules always apply."}
                </p>
              </div>
            </div>
            <div className="settings-body">
              {tab === "account" ? (
                <>
                  <h3>Change your password</h3>
                  <label>
                    Current password
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password.currentPassword}
                      onChange={(e) =>
                        setPassword({
                          ...password,
                          currentPassword: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    New password
                    <input
                      type="password"
                      required
                      minLength={14}
                      maxLength={72}
                      autoComplete="new-password"
                      value={password.newPassword}
                      onChange={(e) =>
                        setPassword({
                          ...password,
                          newPassword: e.target.value,
                        })
                      }
                    />
                    <small>
                      14–72 characters with at least one letter and one number.
                      Changing your password signs out every session.
                    </small>
                  </label>
                </>
              ) : tab === "company" ? (
                <>
                  <label>
                    Company name
                    <input
                      required
                      maxLength={160}
                      value={form.company_name}
                      onChange={(e) =>
                        setForm({ ...form, company_name: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Company timezone
                    <input
                      required
                      value={form.timezone}
                      onChange={(e) =>
                        setForm({ ...form, timezone: e.target.value })
                      }
                    />
                    <small>IANA timezone, e.g. Asia/Kolkata</small>
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Role
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="board">Board members</option>
                      <option value="engineer">Engineering team</option>
                    </select>
                  </label>
                  {!permissionData ? (
                    <Loading />
                  ) : (
                    <div className="permission-grid">
                      {permissionData.available
                        .filter(
                          (p) =>
                            ![
                              "users.manage",
                              "settings.manage",
                              "audit.read",
                              "permissions.manage",
                            ].includes(p),
                        )
                        .map((p) => (
                          <label className="checkbox-label" key={p}>
                            <input
                              type="checkbox"
                              checked={grants.includes(p)}
                              onChange={(e) =>
                                setGrants(
                                  e.target.checked
                                    ? [...grants, p]
                                    : grants.filter((g) => g !== p),
                                )
                              }
                            />
                            {p}
                          </label>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="form-footer">
              <button className="primary" disabled={busy}>
                {busy
                  ? "Saving…"
                  : tab === "account"
                    ? "Change password & sign out"
                    : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
