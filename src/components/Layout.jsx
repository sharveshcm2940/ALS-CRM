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
    [panel, setPanel] = useState(""),
    [notifications, setNotifications] = useState([]),
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
  useEffect(() => {
    setOpen(false);
    setProfile(false);
  }, [location.pathname]);
  async function showNotifications() {
    setPanel("Notifications");
    setError("");
    try {
      setNotifications((await api("/notifications")).data);
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
          <span className="brand-mark">
            a<span>l</span>s
          </span>
          <div>
            ALS Infonet<small>TEAM WORKSPACE</small>
          </div>
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
            <form className="global-search" onSubmit={search}>
              <Search size={16} />
              <input
                aria-label="Search workspace"
                minLength={2}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search workspace…"
              />
              <kbd>↵</kbd>
            </form>
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={showNotifications}
            >
              <Bell size={19} />
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
              {notifications.map((n) => (
                <div className="notification-item" key={n.id}>
                  <p>{n.message}</p>
                  <small>
                    <DateText
                      value={n.created_at}
                      timezone={settings.timezone}
                      time
                    />
                  </small>
                  {!n.read_at && (
                    <button
                      className="text-button"
                      onClick={async () => {
                        try {
                          await api(`/notifications/${n.id}`, {
                            method: "PATCH",
                            body: {},
                          });
                          setNotifications((items) =>
                            items.map((x) =>
                              x.id === n.id ? { ...x, read_at: true } : x,
                            ),
                          );
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
