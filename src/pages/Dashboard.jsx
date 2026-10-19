import React, { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import {
  ArrowUpRight,
  Contact,
  Users,
  FolderKanban,
  Clock3,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Check,
  RotateCcw,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api } from "../services/api";
import {
  PageHeader,
  Loading,
  ErrorBox,
  Empty,
  Badge,
  DateText,
} from "../components/Common";
export default function Dashboard() {
  const { user, settings } = useOutletContext();
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [completing, setCompleting] = useState({}),
    [expandedBriefs, setExpandedBriefs] = useState({}),
    [toast, setToast] = useState("");

  const toggleBrief = (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedBriefs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleComplete = async (task, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (completing[task.id]) return;

    const isCompleted = task.status === "Completed";
    const nextStatus = isCompleted ? "In Progress" : "Completed";
    const nextProgress = isCompleted ? 50 : 100;

    setCompleting((prev) => ({ ...prev, [task.id]: true }));

    // Optimistically update dashboard state
    setData((prev) => {
      if (!prev) return prev;
      const updateList = (list) =>
        list?.map((t) =>
          t.id === task.id
            ? { ...t, status: nextStatus, progress: nextProgress }
            : t,
        );

      const delta = isCompleted ? -1 : 1;
      return {
        ...prev,
        metrics: {
          ...prev.metrics,
          tasks: {
            ...prev.metrics?.tasks,
            completed_month: Math.max(
              0,
              (Number(prev.metrics?.tasks?.completed_month) || 0) + delta,
            ),
          },
        },
        recent: {
          ...prev.recent,
          tasks: updateList(prev.recent?.tasks),
          deadlines: updateList(prev.recent?.deadlines),
          priorities: updateList(prev.recent?.priorities),
        },
        workload: prev.workload?.map((w) =>
          w.id === user.id
            ? {
                ...w,
                completed: Math.max(0, (Number(w.completed) || 0) + delta),
              }
            : w,
        ),
      };
    });

    try {
      await api(`/tasks/${task.id}`, {
        method: "PATCH",
        body: { status: nextStatus, progress: nextProgress },
      });
      setToast(
        isCompleted
          ? `Task "${task.name}" reopened.`
          : `Task "${task.name}" marked as completed!`,
      );
      setTimeout(() => setToast(""), 3500);
    } catch (err) {
      console.error("Failed to update task status:", err);
      setError(err.message);
      setRetry((r) => r + 1);
    } finally {
      setCompleting((prev) => ({ ...prev, [task.id]: false }));
    }
  };

  const renderTaskCard = (t, showBrief = true) => {
    const isCompleted = t.status === "Completed";
    const isBusy = completing[t.id];
    const isExpanded = expandedBriefs[t.id];
    const hasLongBrief = t.description && t.description.length > 110;

    return (
      <div
        key={t.id}
        className={`task-card-item ${isCompleted ? "is-completed" : ""}`}
      >
        <div className="task-card-main">
          <button
            type="button"
            className={`task-complete-toggle ${isCompleted ? "checked" : ""}`}
            onClick={(e) => handleToggleComplete(t, e)}
            disabled={isBusy}
            title={
              isCompleted
                ? "Click to reopen task"
                : "Click to mark as completed"
            }
            aria-label={isCompleted ? "Reopen task" : "Complete task"}
          >
            {isCompleted ? (
              <CheckCircle2 size={20} className="check-icon-done" />
            ) : (
              <span className="check-circle-empty">
                <Check size={12} className="check-icon-hover" />
              </span>
            )}
          </button>

          <div className="task-card-body">
            <div className="task-card-header">
              <Link to={`/tasks?record=${t.id}`} className="task-title-link">
                <strong
                  className={`task-title ${isCompleted ? "strikethrough" : ""}`}
                >
                  {t.name}
                </strong>
              </Link>
              <div className="task-badges-row">
                {t.project_name && (
                  <span className="project-tag-pill" title={t.project_name}>
                    <FolderKanban size={11} />
                    <span>{t.project_name}</span>
                  </span>
                )}
                <Badge value={t.priority} />
                <Badge value={t.status} />
              </div>
            </div>

            {showBrief && t.description && (
              <div className="task-brief-container">
                <div className="task-brief-header">
                  <span className="brief-label">Task Brief</span>
                  {hasLongBrief && (
                    <button
                      type="button"
                      className="brief-toggle-btn"
                      onClick={(e) => toggleBrief(t.id, e)}
                    >
                      {isExpanded ? (
                        <>
                          Show less <ChevronUp size={12} />
                        </>
                      ) : (
                        <>
                          Show full brief <ChevronDown size={12} />
                        </>
                      )}
                    </button>
                  )}
                </div>
                <p
                  className={`task-brief-text ${!isExpanded && hasLongBrief ? "clamped" : ""}`}
                >
                  {t.description}
                </p>
              </div>
            )}

            <div className="task-card-footer">
              <div className="task-dates">
                {t.start_date && (
                  <span className="task-date-item">
                    <span className="date-label">Start:</span>
                    <DateText
                      value={t.start_date}
                      timezone={settings.timezone}
                    />
                  </span>
                )}
                {t.due_date && (
                  <span className="task-date-item">
                    <Clock3 size={13} />
                    <span className="date-label">Deadline:</span>
                    <DateText value={t.due_date} timezone={settings.timezone} />
                  </span>
                )}
              </div>

              <div className="task-actions-cluster">
                <button
                  type="button"
                  className={`task-action-btn ${isCompleted ? "reopen" : "complete"}`}
                  onClick={(e) => handleToggleComplete(t, e)}
                  disabled={isBusy}
                >
                  {isCompleted ? (
                    <>
                      <RotateCcw size={12} />
                      Reopen
                    </>
                  ) : (
                    <>
                      <Check size={13} />
                      Complete Task
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    setError("");
    api("/dashboard")
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message));
  }, [retry]);
  if (error)
    return (
      <div className="state">
        <ErrorBox message={error} />
        <button onClick={() => setRetry((r) => r + 1)}>Retry</button>
      </div>
    );
  if (!data) return <Loading />;
  const { metrics: m, recent, activity, workload } = data;
  const engineer = user.role_id === "engineer";
  const stats = engineer
    ? [
        [
          "My tasks",
          m.tasks?.total || 0,
          CheckCircle2,
          "tasks",
          "All assigned work",
        ],
        [
          "Due today",
          m.tasks?.due_today || 0,
          CalendarDays,
          "tasks",
          "Your next priorities",
        ],
        [
          "Active projects",
          m.projects?.active || 0,
          FolderKanban,
          "projects",
          "Projects you belong to",
        ],
        [
          "Overdue tasks",
          m.tasks?.overdue || 0,
          Clock3,
          "tasks",
          "Needs your attention",
        ],
      ]
    : [
        [
          "Total customers",
          m.customers?.total || 0,
          Contact,
          "customers",
          "Your customer relationships",
        ],
        [
          "Open leads",
          m.leads?.active || 0,
          Users,
          "leads",
          "Opportunities in your pipeline",
        ],
        [
          "Active projects",
          m.projects?.active || 0,
          FolderKanban,
          "projects",
          "Planning, active & on hold",
        ],
        [
          "Overdue tasks",
          m.tasks?.overdue || 0,
          Clock3,
          "tasks",
          "Needs your attention",
        ],
      ];
  return (
    <>
      {toast && (
        <div className="dashboard-toast" role="status">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}
      <PageHeader
        eyebrow={
          engineer
            ? "MY WORKSPACE"
            : user.role_id === "board"
              ? "BOARD OVERVIEW"
              : "EXECUTIVE OVERVIEW"
        }
        title={`Good to see you, ${user.name ? user.name.split(" ")[0] : "there"}.`}
        description="Here’s what’s happening across your workspace."
      >
        <div className="today">
          <CalendarDays size={16} />
          {new Intl.DateTimeFormat("en-IN", {
            timeZone: settings.timezone,
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(new Date())}
        </div>
        {user.permissions.includes("projects.write") && (
          <Link className="primary button" to="/projects?new=1">
            <Plus size={16} />
            New project
          </Link>
        )}
      </PageHeader>
      <div className="stat-grid">
        {stats.map(([label, value, Icon, path, caption]) => (
          <Link className="stat-card" key={label} to={`/${path}`}>
            <div className="stat-top">
              <span>{label}</span>
              <Icon size={18} />
            </div>
            <strong>{value}</strong>
            <div className="stat-caption">
              {caption}
              <ArrowUpRight size={14} />
            </div>
          </Link>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel projects-panel">
          <div className="panel-heading">
            <div>
              <h2>{engineer ? "My projects" : "Project overview"}</h2>
              <p>Current work and progress at a glance</p>
            </div>
            <Link to="/projects" className="text-button">
              View all
              <ArrowRight size={14} />
            </Link>
          </div>
          {recent.projects?.length ? (
            <div className="project-list">
              {recent.projects.map((p) => (
                <Link to={`/projects?record=${p.id}`} key={p.id}>
                  <div className="project-monogram">
                    {(p.name?.[0] || "?").toUpperCase()}
                  </div>
                  <div className="project-summary">
                    <strong>{p.name}</strong>
                    <small>
                      <DateText
                        value={p.due_date}
                        timezone={settings.timezone}
                      />
                    </small>
                  </div>
                  <Badge value={p.status} />
                  <div className="progress-cell">
                    <span>{p.progress}%</span>
                    <div className="progress-track">
                      <i style={{ width: `${p.progress}%` }} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="A clear space for your next project"
              description="Projects and their progress will appear here."
              action={
                user.permissions.includes("projects.write") && (
                  <Link className="text-button" to="/projects?new=1">
                    Create your first project <ArrowRight size={14} />
                  </Link>
                )
              }
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Upcoming meetings</h2>
              <p>Make time for what matters</p>
            </div>
            <Link
              to="/meetings"
              className="icon-button"
              aria-label="View all meetings"
            >
              <ArrowUpRight size={17} />
            </Link>
          </div>
          {recent.meetings?.length ? (
            <div className="meeting-list">
              {recent.meetings.map((v) => (
                <Link key={v.id} to={`/meetings?record=${v.id}`}>
                  <span className="meeting-icon">
                    <CalendarDays size={19} />
                  </span>
                  <div>
                    <strong>{v.name}</strong>
                    <small>
                      <DateText
                        value={v.starts_at}
                        timezone={settings.timezone}
                        time
                      />
                    </small>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="No upcoming meetings"
              description="Your next conversations will appear here."
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{engineer ? "My tasks" : "Recently updated tasks"}</h2>
              <p>
                {Number(m.tasks?.completed_month) || 0} completed this month
              </p>
            </div>
            <Link className="text-button" to="/tasks">
              View all
              <ArrowRight size={14} />
            </Link>
          </div>
          {recent.tasks?.length ? (
            <div className="task-card-list">
              {recent.tasks.map((t) => renderTaskCard(t, true))}
            </div>
          ) : (
            <Empty
              title="No tasks to show"
              description="Assigned tasks and deadlines will appear here."
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Team workload</h2>
              <p>
                {engineer
                  ? "Your assigned work"
                  : "An overview of assigned tasks"}
              </p>
            </div>
            <Link className="icon-button" aria-label="View team" to="/team">
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="workload-list">
            {workload
              .filter((w) => (engineer ? w.id === user.id : true))
              .slice(0, 5)
              .map((w) => (
                <div key={w.id}>
                  <span className="avatar small">
                    {(w.name?.[0] || "?").toUpperCase()}
                  </span>
                  <strong>{w.name}</strong>
                  <div className="workload-bar">
                    <i
                      style={{
                        width: `${w.tasks ? Math.max(5, (w.completed / w.tasks) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <small>{w.tasks} tasks</small>
                </div>
              ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{engineer ? "Upcoming deadlines" : "Priority review"}</h2>
              <p>
                {engineer
                  ? "Your next deadlines, ordered by date"
                  : "Open high-priority work requiring attention"}
              </p>
            </div>
            <Link className="text-button" to="/tasks">
              View tasks
              <ArrowRight size={14} />
            </Link>
          </div>
          {(engineer ? recent.deadlines : recent.priorities)?.length ? (
            <div className="task-card-list">
              {(engineer ? recent.deadlines : recent.priorities).map((t) =>
                renderTaskCard(t, true),
              )}
            </div>
          ) : (
            <Empty
              title={
                engineer ? "No upcoming deadlines" : "No high-priority issues"
              }
              description="You’re up to date with the work visible to you."
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Recent activity</h2>
              <p>The latest updates in your workspace</p>
            </div>
          </div>
          {activity.length ? (
            <div className="activity-list">
              {activity.slice(0, 5).map((a) => (
                <div key={a.id}>
                  <span className="activity-dot" />
                  <div>
                    <p>
                      <strong>{a.actor_name || "System"}</strong> · {a.summary}
                    </p>
                    <small>
                      <DateText
                        value={a.created_at}
                        timezone={settings.timezone}
                        time
                      />
                    </small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="The story starts here"
              description="Team updates appear as work gets done."
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Announcements</h2>
              <p>News for your team</p>
            </div>
            <Link className="text-button" to="/announcements">
              View all
              <ArrowRight size={14} />
            </Link>
          </div>
          {recent.announcements?.length ? (
            <div className="announcement-list">
              {recent.announcements.map((a) => (
                <Link key={a.id} to={`/announcements?record=${a.id}`}>
                  <div className="eyebrow">
                    {a.pinned ? "PINNED UPDATE" : "TEAM UPDATE"}
                  </div>
                  <h3>{a.name}</h3>
                  <p>{a.message}</p>
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="All quiet for now"
              description="Important company updates will appear here."
            />
          )}
        </section>
      </div>
    </>
  );
}
