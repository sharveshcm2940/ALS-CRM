import { calendarDate } from "../utils/dates";
import React, { useState, useEffect, useRef } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  List,
  CalendarDays,
} from "lucide-react";
import { api } from "../services/api";
import { modules } from "../services/modules";
import {
  PageHeader,
  Loading,
  ErrorBox,
  Empty,
  Badge,
  Pagination,
  DateText,
  Modal,
} from "../components/Common";
import RecordForm from "../components/RecordForm";
import RecordDetail from "../components/RecordDetail";
const columnNames = {
  name: "Name",
  organization: "Organization",
  owner_id: "Owner",
  assignee_id: "Assigned to",
  organizer_id: "Organizer",
  status: "Status",
  priority: "Priority",
  follow_up_date: "Follow up",
  value: "Value",
  progress: "Progress",
  due_date: "Due date",
  starts_at: "Start",
  ends_at: "End",
  audience: "Audience",
  pinned: "Pinned",
  created_at: "Published",
};
export default function Records({ module }) {
  const { user, settings } = useOutletContext(),
    definition = modules[module];
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState(null),
    [meta, setMeta] = useState(null),
    [error, setError] = useState(""),
    [q, setQ] = useState(""),
    [filters, setFilters] = useState({}),
    [page, setPage] = useState(1),
    [sort, setSort] = useState("created_at"),
    [direction, setDirection] = useState("desc"),
    [users, setUsers] = useState([]),
    [projects, setProjects] = useState([]),
    [selected, setSelected] = useState(null),
    [edit, setEdit] = useState(false),
    [confirm, setConfirm] = useState(""),
    [notice, setNotice] = useState(""),
    [view, setView] = useState("list"),
    [month, setMonth] = useState(new Date().getMonth()),
    [year, setYear] = useState(new Date().getFullYear());
  const canCreate =
    user.permissions.includes(`${module}.write`) ||
    (module === "tasks" && user.permissions.includes("tasks.create"));
  const loadId = useRef(0);
  async function load(signal) {
    const requestId = ++loadId.current;
    setError("");
    const query = new URLSearchParams({
      q,
      page,
      sort,
      direction,
      ...filters,
      ...(view === "calendar"
        ? {
            limit: 100,
            from: `${year}-${String(month + 1).padStart(2, "0")}-01`,
            to: `${new Date(Date.UTC(year, month + 1, 1)).toISOString().slice(0, 10)}`,
          }
        : {}),
    });
    try {
      const result = await api(`/${module}?${query}`, { signal });
      if (signal?.aborted || requestId !== loadId.current) return;
      setRows(result.data);
      setMeta(result.meta);
    } catch (e) {
      if (!signal?.aborted && requestId === loadId.current) setError(e.message);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(() => load(controller.signal), 200);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [
    module,
    q,
    page,
    sort,
    direction,
    JSON.stringify(filters),
    view,
    month,
    year,
  ]);
  useEffect(() => {
    if (user.permissions.includes("team.read"))
      api("/team")
        .then((r) => setUsers(r.data))
        .catch((e) => setError(e.message));
    if (module === "tasks" && user.permissions.includes("projects.read"))
      api("/projects?limit=100")
        .then((r) => setProjects(r.data))
        .catch((e) => setError(e.message));
  }, [module]);
  useEffect(() => {
    if (params.get("record")) {
      api(`/${module}/${params.get("record")}`)
        .then((r) => {
          setSelected(r.data);
          setEdit(false);
        })
        .catch((e) => setError(e.message));
    } else setSelected(null);
  }, [params.get("record"), module]);
  const creating = params.get("new") === "1" && canCreate;
  function close() {
    setParams({});
    setSelected(null);
    setEdit(false);
  }
  async function saved() {
    close();
    setNotice("Changes saved successfully.");
    await load();
  }
  async function action() {
    try {
      if (confirm === "archive")
        await api(`/${module}/${selected.id}`, { method: "DELETE" });
      else
        await api(`/leads/${selected.id}/convert`, {
          method: "POST",
          body: {},
        });
      setConfirm("");
      await saved();
    } catch (e) {
      setError(e.message);
      setConfirm("");
    }
  }
  function cell(row, key) {
    if (key.endsWith("_id"))
      return users.find((u) => u.id === row[key])?.name || "—";
    if (["status", "priority", "audience"].includes(key))
      return <Badge value={row[key]} />;
    if (
      [
        "due_date",
        "follow_up_date",
        "starts_at",
        "ends_at",
        "created_at",
      ].includes(key)
    )
      return (
        <span
          className={
            key === "due_date" &&
            row[key] &&
            row[key] < calendarDate(new Date(), settings.timezone) &&
            !["Completed", "Cancelled"].includes(row.status)
              ? "overdue"
              : ""
          }
        >
          <DateText
            value={row[key]}
            timezone={settings.timezone}
            time={["starts_at", "ends_at"].includes(key)}
          />
        </span>
      );
    if (key === "progress")
      return (
        <div className="inline-progress">
          <div className="progress-track">
            <i style={{ width: `${row[key]}%` }} />
          </div>
          {row[key]}%
        </div>
      );
    if (key === "value")
      return `${row.currency} ${Number(row.value).toLocaleString("en-IN")}`;
    if (key === "pinned") return row[key] ? "Pinned" : "—";
    return row[key] || "—";
  }
  function shift(delta) {
    const d = new Date(year, month + delta, 1);
    setMonth(d.getMonth());
    setYear(d.getFullYear());
    setPage(1);
  }
  const dayOf = (v) => {
    if (!v || typeof v !== "string") return "";
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: settings.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(v.replace(" ", "T") + "Z"));
  };
  return (
    <>
      <PageHeader title={definition.title} description={definition.description}>
        {canCreate && (
          <button
            className="primary"
            onClick={() => {
              setParams({ new: "1" });
              setEdit(false);
            }}
          >
            <Plus size={17} />
            New {definition.singular}
          </button>
        )}
      </PageHeader>
      <ErrorBox message={error} />
      {notice && (
        <div className="success" role="status">
          {notice}
          <button className="text-button" onClick={() => setNotice("")}>
            Dismiss
          </button>
        </div>
      )}
      <section className="panel records-panel">
        <div className="table-toolbar">
          <div className="table-search">
            <Search size={17} />
            <input
              aria-label={`Search ${module}`}
              placeholder={`Search ${module}…`}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="table-filters">
            {["status", "priority"]
              .map((f) => definition.fields.find((x) => x.key === f))
              .filter(Boolean)
              .map((f) => (
                <select
                  aria-label={`Filter ${f.label}`}
                  key={f.key}
                  value={filters[f.key] || ""}
                  onChange={(e) => {
                    setFilters({ ...filters, [f.key]: e.target.value });
                    setPage(1);
                  }}
                >
                  <option value="">
                    All {f.key === "status" ? "statuses" : "priorities"}
                  </option>
                  {f.options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ))}
            {module === "tasks" && (
              <>
                <select
                  aria-label="Filter assignee"
                  value={filters.assignee_id || ""}
                  onChange={(e) => {
                    setFilters({ ...filters, assignee_id: e.target.value });
                    setPage(1);
                  }}
                >
                  <option value="">All assignees</option>
                  {users.map((u) => (
                    <option value={u.id} key={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter project"
                  value={filters.project_id || ""}
                  onChange={(e) => {
                    setFilters({ ...filters, project_id: e.target.value });
                    setPage(1);
                  }}
                >
                  <option value="">All projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </>
            )}
            {module === "meetings" && (
              <>
                <select
                  aria-label="Meeting period"
                  value={filters.period || ""}
                  onChange={(e) => {
                    setFilters({ ...filters, period: e.target.value });
                    setPage(1);
                  }}
                >
                  <option value="">All meetings</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                </select>
                <button
                  aria-label="Toggle calendar view"
                  onClick={() => {
                    setView(view === "list" ? "calendar" : "list");
                    setPage(1);
                  }}
                >
                  {view === "list" ? (
                    <CalendarDays size={17} />
                  ) : (
                    <List size={17} />
                  )}
                </button>
              </>
            )}
            <button
              aria-label="Sort by name"
              title="Sort by name"
              onClick={() => {
                setSort("name");
                setDirection(direction === "asc" ? "desc" : "asc");
              }}
            >
              <ArrowDownUp size={16} />
            </button>
          </div>
        </div>
        {error && !rows ? (
          <Empty
            title="Could not load records"
            description="Please try again."
            action={<button onClick={() => load()}>Retry</button>}
          />
        ) : !rows ? (
          <Loading />
        ) : view === "calendar" ? (
          <>
            <div className="calendar-heading">
              <button aria-label="Previous month" onClick={() => shift(-1)}>
                <ChevronLeft size={16} />
              </button>
              <h3>
                {new Date(year, month).toLocaleString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </h3>
              <button aria-label="Next month" onClick={() => shift(1)}>
                <ChevronRight size={16} />
              </button>
              <small>{settings.timezone}</small>
            </div>
            <div className="calendar-grid">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <strong key={d}>{d}</strong>
              ))}
              {Array.from(
                { length: new Date(year, month, 1).getDay() },
                (_, i) => (
                  <div key={`blank${i}`} className="blank-day" />
                ),
              )}
              {Array.from(
                { length: new Date(year, month + 1, 0).getDate() },
                (_, i) => {
                  const day = `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
                  return (
                    <div className="calendar-day" key={day}>
                      <span>{i + 1}</span>
                      {rows
                        .filter((r) => dayOf(r.starts_at) === day)
                        .map((r) => (
                          <button
                            key={r.id}
                            onClick={() => setParams({ record: r.id })}
                          >
                            {r.name}
                          </button>
                        ))}
                    </div>
                  );
                },
              )}
            </div>
          </>
        ) : rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {definition.columns.map((c) => (
                    <th key={c}>{columnNames[c]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    {definition.columns.map((c, i) => (
                      <td key={c}>
                        {i === 0 ? (
                          <button
                            className="record-name"
                            onClick={() => setParams({ record: r.id })}
                          >
                            <span className={`record-monogram ${module}`}>
                              {(r.name?.[0] || "?").toUpperCase()}
                            </span>
                            {r.name}
                          </button>
                        ) : (
                          cell(r, c)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={
              q || Object.values(filters).some(Boolean)
                ? "No matching records"
                : `No ${module} yet`
            }
            description={
              q || Object.values(filters).some(Boolean)
                ? "Try a different search or filter."
                : `Your ${module} will appear here. Start with your first ${definition.singular}.`
            }
            action={
              canCreate && (
                <button onClick={() => setParams({ new: "1" })}>
                  <Plus size={16} />
                  Add {definition.singular}
                </button>
              )
            }
          />
        )}
        <Pagination meta={meta} onPage={setPage} />
      </section>
      {(creating || selected) && (
        <Modal
          wide
          title={
            creating
              ? `New ${definition.singular}`
              : edit
                ? `Edit ${definition.singular}`
                : selected.name
          }
          onClose={close}
        >
          {creating || edit ? (
            <RecordForm
              module={module}
              record={creating ? null : selected}
              user={user}
              onCancel={close}
              onSaved={saved}
            />
          ) : (
            <RecordDetail
              module={module}
              record={selected}
              user={user}
              timezone={settings.timezone}
              onEdit={() => setEdit(true)}
              onArchive={() => setConfirm("archive")}
              onConvert={() => setConfirm("convert")}
            />
          )}
        </Modal>
      )}
      {confirm && (
        <Modal
          title={
            confirm === "archive"
              ? "Archive this record?"
              : "Convert this lead?"
          }
          onClose={() => setConfirm("")}
        >
          <p>
            {confirm === "archive"
              ? "The record will be removed from active views. Its business history will be retained."
              : "A customer will be created using this lead’s contact details, and the lead will be marked Won."}
          </p>
          <div className="form-footer">
            <button onClick={() => setConfirm("")}>Cancel</button>
            <button className="primary" onClick={action}>
              Confirm {confirm}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
