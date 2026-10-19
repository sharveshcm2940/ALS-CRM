import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Download, FileBarChart2 } from "lucide-react";
import { api, downloadReport } from "../services/api";
import {
  PageHeader,
  Loading,
  ErrorBox,
  Empty,
  Badge,
} from "../components/Common";
const reports = [
  ["pipeline", "Lead pipeline", "leads"],
  ["customers", "Customer summary", "customers"],
  ["projects", "Project status", "projects"],
  ["completion", "Task completion", "tasks"],
  ["overdue", "Overdue tasks", "tasks"],
  ["workload", "Team workload", "tasks"],
];
export default function Reports() {
  const { user } = useOutletContext();
  const available = reports.filter((r) =>
    user.permissions.includes(`${r[2]}.read`),
  );
  const [selected, setSelected] = useState(available[0]?.[0]),
    [rows, setRows] = useState(null),
    [error, setError] = useState(""),
    [truncated, setTruncated] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!selected) return;
    setRows(null);
    setError("");
    const controller = new AbortController();
    api(`/reports/${selected}`, { signal: controller.signal })
      .then((r) => {
        if (controller.signal.aborted) return;
        setRows(r.data);
        setTruncated(r.meta.truncated);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [selected, retry]);
  async function download() {
    try {
      await downloadReport(selected);
    } catch (e) {
      setError(e.message);
    }
  }
  const fields =
    selected === "workload"
      ? ["assignee", "total", "completed", "overdue"]
      : [
          "name",
          "status",
          ...(selected === "pipeline" ? ["value", "currency"] : []),
        ];
  const summary = rows
    ? Object.entries(
        rows.reduce((a, r) => {
          const key = r.status || "Assigned tasks";
          a[key] =
            (a[key] || 0) + (selected === "workload" ? Number(r.total) : 1);
          return a;
        }, {}),
      )
    : [];
  return (
    <>
      <PageHeader
        title="Reports & insights"
        description="A practical view of your business, built from your workspace records."
      >
        {selected && user.permissions.includes("reports.export") && (
          <button onClick={download}>
            <Download size={16} />
            Export CSV
          </button>
        )}
      </PageHeader>
      <div className="report-layout">
        <aside className="panel report-nav">
          {available.map(([id, label]) => (
            <button
              key={id}
              className={selected === id ? "selected" : ""}
              onClick={() => setSelected(id)}
            >
              <FileBarChart2 size={17} />
              {label}
            </button>
          ))}
        </aside>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>
                {available.find((r) => r[0] === selected)?.[1] ||
                  "No reports available"}
              </h2>
              <p>Live database records · Permission-controlled access</p>
            </div>
          </div>
          <ErrorBox message={error} />
          {truncated && (
            <p className="warning">
              This report is limited to the first 10,000 accessible records.
            </p>
          )}
          {!selected ? (
            <Empty title="No reports available" />
          ) : error && !rows ? (
            <Empty
              title="Could not load report"
              description="Please try again."
              action={
                <button onClick={() => setRetry((r) => r + 1)}>Retry</button>
              }
            />
          ) : !rows ? (
            <Loading />
          ) : rows.length ? (
            <>
              <div className="report-summaries">
                {summary.map(([key, value]) => (
                  <div key={key}>
                    <span>{key}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {fields.map((f) => (
                        <th key={f}>{f.replaceAll("_", " ")}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.id || i}>
                        {fields.map((f) => (
                          <td key={f}>
                            {f === "status" ? <Badge value={r[f]} /> : r[f]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <Empty
              title="No data to report yet"
              description="Reports populate automatically as your team creates records."
            />
          )}
        </section>
      </div>
    </>
  );
}
