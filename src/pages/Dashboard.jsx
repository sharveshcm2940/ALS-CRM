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
  Plus,
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
    [retry, setRetry] = useState(0);
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
      <PageHeader
        eyebrow={
          engineer
            ? "MY WORKSPACE"
            : user.role_id === "board"
              ? "BOARD OVERVIEW"
              : "EXECUTIVE OVERVIEW"
        }
        title={`Good to see you, ${user.name.split(" ")[0]}.`}
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
                  <div className="project-monogram">{p.name[0]}</div>
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
            <div className="task-list">
              {recent.tasks.map((t) => (
                <Link to={`/tasks?record=${t.id}`} key={t.id}>
                  <CheckCircle2 size={18} />
                  <div>
                    <strong>{t.name}</strong>
                    <small>
                      <DateText
                        value={t.due_date}
                        timezone={settings.timezone}
                      />
                    </small>
                  </div>
                  <Badge value={t.status} />
                </Link>
              ))}
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
                  <span className="avatar small">{w.name[0]}</span>
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
            <div className="task-list">
              {(engineer ? recent.deadlines : recent.priorities).map((t) => (
                <Link key={t.id} to={`/tasks?record=${t.id}`}>
                  <Clock3 size={18} />
                  <div>
                    <strong>{t.name}</strong>
                    <small>
                      <DateText
                        value={t.due_date}
                        timezone={settings.timezone}
                      />
                    </small>
                  </div>
                  <Badge value={t.priority} />
                </Link>
              ))}
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
