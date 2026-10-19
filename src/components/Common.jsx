import { formatDate } from "../utils/dates";
import React, { useEffect, useRef } from "react";
import { X, Inbox, LoaderCircle, AlertCircle } from "lucide-react";
export function Loading() {
  return (
    <div className="state">
      <LoaderCircle className="spin" size={23} />
      <span>Loading your workspace…</span>
    </div>
  );
}
export function ErrorBox({ message }) {
  return message ? (
    <div className="error" role="alert">
      <AlertCircle size={17} />
      {message}
    </div>
  ) : null;
}
export function Empty({
  title = "Nothing here yet",
  description = "New records will appear here as your team gets to work.",
  action,
}) {
  return (
    <div className="state">
      <div className="empty-icon">
        <Inbox size={25} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Badge({ value }) {
  const tone = ["Completed", "Active", "Won", "Qualified"].includes(value)
    ? "green"
    : ["High", "Urgent", "Overdue", "Lost"].includes(value)
      ? "red"
      : ["In Progress", "Proposal", "New"].includes(value)
        ? "blue"
        : "gray";
  return <span className={`badge ${tone}`}>{String(value ?? "—")}</span>;
}
export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function PageHeader({
  eyebrow = "WORKSPACE",
  title,
  description,
  children,
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="header-actions">{children}</div>
    </div>
  );
}
export function Pagination({ meta, onPage }) {
  if (!meta?.total) return null;
  return (
    <div className="pagination">
      <span>
        {(meta.page - 1) * meta.limit + 1}–
        {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} records
      </span>
      <div>
        <button disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
          Previous
        </button>
        <span>
          Page {meta.page} of {meta.pages}
        </span>
        <button
          disabled={meta.page >= meta.pages}
          onClick={() => onPage(meta.page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
export function DateText({ value, timezone = "Asia/Kolkata", time = false }) {
  return <>{formatDate(value, timezone, time)}</>;
}
