import Brand from "./Brand";
import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Contact,
  FolderKanban,
  CheckSquare,
  CalendarDays,
  Megaphone,
  ChartNoAxesCombined,
  Settings,
  Search,
  Bell,
  ChevronDown,
  Menu,
  X,
  LogOut,
  PanelLeftClose,
  ShieldCheck,
  Plus,
  CheckCheck,
} from "lucide-react";
import { api } from "../services/api";
import { Modal, ErrorBox, DateText, Empty } from "./Common";

const nav = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["customers", "Customers", Contact],
  ["leads", "Leads", Users],
  ["projects", "Projects", FolderKanban],
  ["tasks", "Tasks", CheckSquare],
  ["meetings", "Meetings", CalendarDays],
  ["announcements", "Announcements", Megaphone],
  ["reports", "Reports", ChartNoAxesCombined],
  ["team", "Team", Users],
  ["settings", "Settings", Settings],
];

export const roleLabels = {
  ceo: "Chief Executive Officer",
  board: "Board member",
  engineer: "Engineering team",
};

export default function Layout({ user, onLogout, settings }) {
  const [open, setOpen] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    [profile, setProfile] = useState(false),
    [quickCreateOpen, setQuickCreateOpen] = useState(false),
    [panel, setPanel] = useState(""),
    [notifications, setNotifications] = useState([]),
    [unreadCount, setUnreadCount] = useState(0),
    [q, setQ] = useState(""),
    [results, setResults] = useState(null),
    [error, setError] = useState("");

  const location = useLocation(),
    navigate = useNavigate();

  const visible = nav.filter(
    ([key]) =>
      key === "dashboard" ||
      key === "settings" ||
      user.permissions.includes(`${key}.read`),
  );

  const canCreateModules = [
    {
      key: "tasks",
      label: "Task",
      icon: CheckSquare,
      allowed:
        user.permissions.includes("tasks.write") ||
        user.permissions.includes("tasks.create") ||
        user.role_id === "engineer",
    },
    {
      key: "leads",
      label: "Lead",
      icon: Users,
      allowed: user.permissions.includes("leads.write"),
    },
    {
      key: "projects",
      label: "Project",
      icon: FolderKanban,
      allowed: user.permissions.includes("projects.write"),
    },
    {
      key: "customers",
      label: "Customer",
      icon: Contact,
      allowed: user.permissions.includes("customers.write"),
    },
    {
      key: "meetings",
      label: "Meeting",
      icon: CalendarDays,
      allowed: user.permissions.includes("meetings.write"),
    },
    {
      key: "announcements",
      label: "Announcement",
      icon: Megaphone,
      allowed: user.permissions.includes("announcements.write"),
    },
  ].filter((m) => m.allowed);

  const fetchNotificationCounts = async () => {
    try {
      const res = await api("/notifications");
      setUnreadCount(res.meta?.unread || 0);
      setNotifications(res.data || []);
    } catch {}
  };

  useEffect(() => {
    setOpen(false);
    setProfile(false);
    setQuickCreateOpen(false);
    fetchNotificationCounts();
  }, [location.pathname]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPanel("Search");
        setError("");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function showNotifications() {
    setPanel("Notifications");
    setError("");
    try {
      const res = await api("/notifications");
      setNotifications(res.data || []);
      setUnreadCount(res.meta?.unread || 0);
    } catch (e) {
      setError(e.message);
    }
  }

  async function markAllNotificationsRead() {
    try {
      await api("/notifications/read-all", { method: "PATCH", body: {} });
      setNotifications((items) =>
        items.map((x) => ({ ...x, read_at: new Date().toISOString() })),
      );
      setUnreadCount(0);
    } catch (e) {
      setError(e.message);
    }
  }

  async function search(e) {
    e.preventDefault();
    setPanel("Search");
    setError("");
    setResults(null);
    try {
      setResults((await api(`/search?q=${encodeURIComponent(q)}`)).data);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className={`app-shell ${collapsed ? "collapsed" : ""}`}>
      <button
        className={`drawer-backdrop ${open ? "visible" : ""}`}
        aria-label="Close navigation"
        onClick={() => setOpen(false)}
      />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <NavLink className="brand" to="/dashboard">
          <Brand />
        </NavLink>
        <div className="workspace-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {visible.map(([path, label, Icon]) => (
            <NavLink title={label} key={path} to={`/${path}`}>
              <Icon size={18} />
              <span>{label}</span>
              {path === "dashboard" && <i />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="private-workspace">
            <ShieldCheck size={17} />
            <div>
              Private workspace<small>Only your team has access</small>
            </div>
          </div>
          <button
            className="collapse-button"
            onClick={() => setCollapsed(!collapsed)}
          >
            <PanelLeftClose size={17} />
            <span>Collapse sidebar</span>
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <span className="slash">/</span>
            <strong>
              {nav.find(([p]) => location.pathname.includes(p))?.[1] ||
                "Dashboard"}
            </strong>
          </div>

          <div className="topbar-tools">
            {canCreateModules.length > 0 && (
              <div className="quick-create-wrap">
                <button
                  type="button"
                  className="quick-create-btn"
                  onClick={() => setQuickCreateOpen(!quickCreateOpen)}
                  aria-expanded={quickCreateOpen}
                  title="Create new record"
                >
                  <Plus size={15} />
                  <span>New</span>
                  <ChevronDown size={13} />
                </button>
                {quickCreateOpen && (
                  <div className="quick-create-menu">
                    {canCreateModules.map((m) => {
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.key}
                          onClick={() => {
                            setQuickCreateOpen(false);
                            navigate(`/${m.key}?new=1`);
                          }}
                        >
                          <Icon size={15} />
                          <span>New {m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <form className="global-search" onSubmit={search}>
              <Search size={16} />
              <input
                aria-label="Search workspace"
                minLength={2}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search workspace… (Ctrl+K)"
              />
              <kbd>↵</kbd>
            </form>

            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={showNotifications}
              title={
                unreadCount > 0
                  ? `${unreadCount} unread notifications`
                  : "Notifications"
              }
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="notification-badge">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            <div className="profile-wrap">
              <button
                className="profile"
                onClick={() => setProfile(!profile)}
                aria-expanded={profile}
              >
                <span className="avatar">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </span>
                <span className="profile-name">
                  {user.name}
                  <small>
                    {user.role_id === "ceo" ? "CEO" : roleLabels[user.role_id]}
                  </small>
                </span>
                <ChevronDown size={15} />
              </button>
              {profile && (
                <div className="profile-menu">
                  <button
                    onClick={() => {
                      navigate("/settings");
                      setProfile(false);
                    }}
                  >
                    My account
                  </button>
                  <button onClick={onLogout}>
                    <LogOut size={15} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="main-content">
          <Outlet context={{ user, settings }} />
        </main>
        <footer className="workspace-footer">
          <span>ALS Infonet · Team workspace</span>
          <span>{settings.timezone} · Secure session</span>
        </footer>
      </div>

      {panel && (
        <Modal title={panel} onClose={() => setPanel("")}>
          <ErrorBox message={error} />
          {panel === "Search" ? (
            results?.length ? (
              <div className="stack">
                {results.map((r) => (
                  <button
                    className="search-result"
                    key={r.id}
                    onClick={() => {
                      navigate(`/${r.module}?record=${r.id}`);
                      setPanel("");
                    }}
                  >
                    <span>{r.name}</span>
                    <small>{r.module}</small>
                  </button>
                ))}
              </div>
            ) : (
              <Empty
                title={results ? "No matching records" : "Searching…"}
                description="Search returns only records you have permission to view."
              />
            )
          ) : notifications.length ? (
            <div className="stack">
              <div className="notifications-header-bar">
                <span className="notifications-count-label">
                  {notifications.length} recent update
                  {notifications.length === 1 ? "" : "s"}
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="mark-all-btn"
                    onClick={markAllNotificationsRead}
                  >
                    <CheckCheck size={14} />
                    <span>Mark all as read</span>
                  </button>
                )}
              </div>
              {notifications.map((n) => (
                <div
                  className={`notification-item ${!n.read_at ? "unread" : ""}`}
                  key={n.id}
                >
                  <div className="notification-content">
                    <p>{n.message}</p>
                    <small>
                      <DateText
                        value={n.created_at}
                        timezone={settings.timezone}
                        time
                      />
                    </small>
                  </div>
                  {!n.read_at && (
                    <button
                      className="text-button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await api(`/notifications/${n.id}`, {
                            method: "PATCH",
                            body: {},
                          });
                          setNotifications((items) =>
                            items.map((x) =>
                              x.id === n.id
                                ? { ...x, read_at: new Date().toISOString() }
                                : x,
                            ),
                          );
                          setUnreadCount((prev) => Math.max(0, prev - 1));
                        } catch (e) {
                          setError(e.message);
                        }
                      }}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="You're all caught up"
              description="New assignments and updates will appear here."
            />
          )}
        </Modal>
      )}
    </div>
  );
}
