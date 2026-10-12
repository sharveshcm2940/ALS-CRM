import Link from "next/link";
export default function NotFound() {
  return (
    <section className="section error-page">
      <span className="eyebrow">404 / ADDRESS NOT FOUND</span>
      <h1>Let’s find your way home.</h1>
      <Link className="button" href="/">
        Explore our residences ↗
      </Link>
    </section>
  );
}
