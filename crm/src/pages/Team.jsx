import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, KeyRound, Pencil } from "lucide-react";
import { api } from "../services/api";
import {
  PageHeader,
  Loading,
  ErrorBox,
  Modal,
  Badge,
} from "../components/Common";
import { roleLabels } from "../components/Layout";
export default function Team() {
  const { user } = useOutletContext();
  const admin =
    user.role_id === "ceo" && user.permissions.includes("users.manage");
  const [rows, setRows] = useState(null),
    [error, setError] = useState(""),
    [editing, setEditing] = useState(null),
    [credential, setCredential] = useState(null),
    [reset, setReset] = useState(null);
  async function load() {
    try {
      setRows((await api(admin ? "/users" : "/team")).data);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, [admin]);
  async function resetPassword() {
    try {
      const r = await api(`/users/${reset.id}/reset-password`, {
        method: "POST",
        body: {},
      });
      setCredential({ username: reset.username, ...r.data });
      setReset(null);
      await load();
    } catch (e) {
      setError(e.message);
      setReset(null);
    }
  }
  return (
    <>
      <PageHeader
        title="Our team"
        description="The people behind the work. Individual accounts, shared purpose."
      >
        {admin && (
          <button className="primary" onClick={() => setEditing({})}>
            <Plus size={17} />
            Add team member
          </button>
        )}
      </PageHeader>
      <ErrorBox message={error} />
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Team directory</h2>
            <p>
              {rows?.length || 0} team members · Role-based workspace access
            </p>
          </div>
        </div>
        {!rows ? (
          <Loading />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Team member</th>
                  <th>Role</th>
                  {admin && <th>Verified email</th>}
                  <th>Status</th>
                  {admin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="member-cell">
                        <span className="avatar">
                          {u.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </span>
                        <div>
                          <strong>{u.name}</strong>
                          {admin && <small>{u.username}</small>}
                        </div>
                      </div>
                    </td>
                    <td>{roleLabels[u.role_id]}</td>
                    {admin && (
                      <td>
                        {u.email ? (
                          u.email_verified ? (
                            u.email
                          ) : (
                            `${u.email} (unverified)`
                          )
                        ) : (
                          <span className="muted">Not provided</span>
                        )}
                      </td>
                    )}
                    <td>
                      <Badge value={u.active ? "Active" : "Inactive"} />
                    </td>
                    {admin && (
                      <td>
                        <div className="row-actions">
                          <button
                            aria-label={`Edit ${u.name}`}
                            onClick={() => setEditing(u)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            aria-label={`Reset password for ${u.name}`}
                            onClick={() => setReset(u)}
                          >
                            <KeyRound size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {editing && (
        <Modal
          title={editing.id ? "Edit team member" : "Add team member"}
          onClose={() => setEditing(null)}
        >
          <UserForm
            value={editing}
            onCancel={() => setEditing(null)}
            onSave={async (r) => {
              if (r.data.temporary_password) setCredential(r.data);
              setEditing(null);
              await load();
            }}
          />
        </Modal>
      )}
      {credential && (
        <Modal
          title="Individual temporary credential"
          onClose={() => setCredential(null)}
        >
          <div className="credential">
            <p>
              Deliver this credential to the account owner through a verified
              private channel. It is shown once. They must change it at sign-in.
            </p>
            {credential.username && (
              <p>
                Username: <strong>{credential.username}</strong>
              </p>
            )}
            <label>
              Temporary password
              <input
                readOnly
                value={credential.temporary_password}
                onFocus={(e) => e.target.select()}
              />
            </label>
          </div>
          <div className="form-footer">
            <button className="primary" onClick={() => setCredential(null)}>
              I have saved it securely
            </button>
          </div>
        </Modal>
      )}
      {reset && (
        <Modal
          title={`Reset ${reset.name}'s password?`}
          onClose={() => setReset(null)}
        >
          <p>
            This will revoke all of their sessions and require a password change
            at next sign-in.
          </p>
          <div className="form-footer">
            <button onClick={() => setReset(null)}>Cancel</button>
            <button className="primary" onClick={resetPassword}>
              Issue temporary credential
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function UserForm({ value, onCancel, onSave }) {
  const [form, setForm] = useState({
      name: value.name || "",
      username: value.username || "",
      email: value.email || "",
      email_verified: !!value.email_verified,
      role_id: value.role_id || "engineer",
      active: value.active === undefined ? true : !!value.active,
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave(
        await api(`/users${value.id ? "/" + value.id : ""}`, {
          method: value.id ? "PATCH" : "POST",
          body: form,
        }),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <ErrorBox message={error} />
      <div className="form-grid">
        {["name", "username", "email"].map((f) => (
          <label key={f}>
            {f === "email"
              ? "Email (optional, verified details only)"
              : f === "name"
                ? "Full name"
                : "Username"}
            <input
              type={f === "email" ? "email" : "text"}
              required={f !== "email"}
              value={form[f]}
              onChange={(e) => setForm({ ...form, [f]: e.target.value })}
            />
          </label>
        ))}
        <label>
          Role
          <select
            value={form.role_id}
            onChange={(e) => setForm({ ...form, role_id: e.target.value })}
          >
            {Object.entries(roleLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-label full">
          <input
            type="checkbox"
            checked={form.email_verified}
            onChange={(e) =>
              setForm({ ...form, email_verified: e.target.checked })
            }
          />
          I have independently verified this email address
        </label>
        <label className="checkbox-label full">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Account active
        </label>
      </div>
      <div className="form-footer">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary" disabled={busy}>
          {busy ? "Saving…" : "Save account"}
        </button>
      </div>
    </form>
  );
}
