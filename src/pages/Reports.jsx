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
              {selected === "pipeline" &&
                rows.length > 0 &&
                (() => {
                  const nonLost = rows.filter((r) => r.status !== "Lost");
                  const totalPipelineValue = nonLost.reduce(
                    (sum, r) => sum + (Number(r.value) || 0),
                    0,
                  );
                  const wonRows = rows.filter((r) => r.status === "Won");
                  const wonValue = wonRows.reduce(
                    (sum, r) => sum + (Number(r.value) || 0),
                    0,
                  );
                  const closedCount = rows.filter((r) =>
                    ["Won", "Lost"].includes(r.status),
                  ).length;
                  const winRate =
                    closedCount > 0
                      ? Math.round((wonRows.length / closedCount) * 100)
                      : 0;
                  const activeDeals = rows.filter(
                    (r) => !["Won", "Lost"].includes(r.status),
                  ).length;
                  const avgDeal =
                    nonLost.length > 0
                      ? Math.round(totalPipelineValue / nonLost.length)
                      : 0;

                  const pipelineStages = [
                    "New",
                    "Contacted",
                    "Qualified",
                    "Proposal",
                    "Negotiation",
                    "Won",
                  ];
                  const stageStats = pipelineStages.map((st) => {
                    const matching = rows.filter((r) => r.status === st);
                    const val = matching.reduce(
                      (acc, r) => acc + (Number(r.value) || 0),
                      0,
                    );
                    return { stage: st, count: matching.length, value: val };
                  });

                  return (
                    <div className="pipeline-funnel-card">
                      <div className="funnel-metrics-row">
                        <div className="funnel-metric">
                          <span>Total Pipeline</span>
                          <strong>
                            ₹{totalPipelineValue.toLocaleString("en-IN")}
                          </strong>
                        </div>
                        <div className="funnel-metric">
                          <span>Active Deals</span>
                          <strong>{activeDeals}</strong>
                        </div>
                        <div className="funnel-metric">
                          <span>Won Value</span>
                          <strong>₹{wonValue.toLocaleString("en-IN")}</strong>
                        </div>
                        <div className="funnel-metric">
                          <span>Win Rate</span>
                          <strong>{winRate}%</strong>
                        </div>
                        <div className="funnel-metric">
                          <span>Avg Deal Size</span>
                          <strong>₹{avgDeal.toLocaleString("en-IN")}</strong>
                        </div>
                      </div>

                      <div className="funnel-bar-container">
                        <span className="funnel-label">
                          Pipeline Stage Distribution:
                        </span>
                        <div className="funnel-segmented-track">
                          {stageStats.map((st) => {
                            const pct =
                              totalPipelineValue > 0
                                ? Math.max(
                                    3,
                                    Math.round(
                                      (st.value / totalPipelineValue) * 100,
                                    ),
                                  )
                                : Math.round(100 / stageStats.length);
                            if (st.count === 0 && st.value === 0) return null;

                            return (
                              <div
                                key={st.stage}
                                className={`funnel-segment ${st.stage.toLowerCase()}`}
                                style={{ flex: pct }}
                                title={`${st.stage}: ${st.count} deals (₹${st.value.toLocaleString("en-IN")})`}
                              >
                                <span>
                                  {st.stage} ({st.count})
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

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
