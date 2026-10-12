"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <section className="section error-page">
      <span className="eyebrow">A MOMENTARY INTERRUPTION</span>
      <h2>Let’s try that again.</h2>
      <p style={{ margin: "25px 0" }}>This page could not be loaded.</p>
      <button onClick={reset} className="button">
        Try again ↗
      </button>
    </section>
  );
}
