import React, { useEffect, useState, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { api } from "./services/api";
import { Loading, Empty } from "./components/Common";
import Layout from "./components/Layout";
import Auth from "./pages/Auth";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Records = lazy(() => import("./pages/Records"));
const Team = lazy(() => import("./pages/Team"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
import { modules } from "./services/modules";
import "./styles/app.css";
function App() {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [settings, setSettings] = useState({
      company_name: "ALS Infonet",
      timezone: "Asia/Kolkata",
    });
  async function refreshSettings() {
    setSettings((await api("/settings")).data);
  }
  async function refresh() {
    try {
      const me = (await api("/auth/me")).data;
      setUser(me);
      if (!me.must_change_password) await refreshSettings();
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST", body: {} });
      setUser(null);
    } catch (e) {
      if (e.message.includes("session has expired")) setUser(null);
      else window.alert("Sign-out could not be confirmed. " + e.message);
    }
  }
  useEffect(() => {
    refresh();
    const expired = () => setUser(null);
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  if (loading) return <Loading />;
  if (!user) return <Auth onLogin={refresh} />;
  if (user.must_change_password)
    return <Auth change onLogin={refresh} onLogout={logout} />;
  const protectedPage = (permission, element) =>
    user.permissions.includes(permission) ? (
      element
    ) : (
      <Empty
        title="Access restricted"
        description="Your account does not have permission to view this module."
      />
    );
  return (
    <Routes>
      <Route
        element={<Layout user={user} onLogout={logout} settings={settings} />}
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        {Object.keys(modules).map((m) => (
          <Route
            key={m}
            path={m}
            element={protectedPage(`${m}.read`, <Records key={m} module={m} />)}
          />
        ))}
        <Route path="team" element={protectedPage("team.read", <Team />)} />
        <Route
          path="reports"
          element={protectedPage("reports.read", <Reports />)}
        />
        <Route
          path="settings"
          element={
            <Settings onSettingsChanged={refreshSettings} onLogout={logout} />
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Suspense fallback={<Loading />}>
      <App />
    </Suspense>
  </BrowserRouter>,
);
