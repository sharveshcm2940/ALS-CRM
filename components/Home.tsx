"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { properties } from "@/lib/data";
import { Amenities, Enquiry, Gallery, Picture } from "./UI";
export function Home() {
  const [location, setLocation] = useState("All locations");
  const [type, setType] = useState("All residences");
  const [budget, setBudget] = useState("Any budget");
  const [filters, setFilters] = useState({
    location: "All locations",
    type: "All residences",
    budget: "Any budget",
  });
  const [featured, setFeatured] = useState(0);
  const reduced = useReducedMotion();
  const results = properties.filter(
    (p) =>
      (filters.location === "All locations" ||
        p.location.includes(filters.location)) &&
      (filters.type === "All residences" || p.type === filters.type) &&
      (filters.budget === "Any budget" || p.price <= Number(filters.budget)),
  );
  const p = properties[featured];
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(
      () => setFeatured((i) => (i + 1) % properties.length),
      8000,
    );
    return () => clearInterval(t);
  }, [reduced]);
  return (
    <>
      <section className="hero">
        <div className="hero-picture" data-parallax>
          <motion.div
            className="fill"
            initial={
              reduced ? false : { scale: 1.1, clipPath: "inset(0 0 100% 0)" }
            }
            animate={{ scale: 1, clipPath: "inset(0 0 0% 0)" }}
            transition={{ duration: 1.8, ease: [0.2, 0.65, 0.3, 1] }}
          >
            <Picture
              id="hero"
              alt="Contemporary residence framed by trees and warm evening light"
              priority
            />
          </motion.div>
        </div>
        <div className="hero-shade" />
        <div className="hero-content">
          <motion.span
            className="eyebrow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            A CONSIDERED WAY OF LIVING
          </motion.span>
          <h1>
            {["In a city that never stops,", "find your stillness."].map(
              (line, i) => (
                <span className="line-mask" key={line}>
                  <motion.span
                    initial={reduced ? false : { y: "110%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: 1.1, delay: 0.25 + i * 0.15 }}
                  >
                    {i === 1 ? <em>{line}</em> : line}
                  </motion.span>
                </span>
              ),
            )}
          </h1>
          <motion.div
            className="hero-bottom"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <p>
              Thoughtful residences. Extraordinary everyday living.
              <br />
              Find a place that feels entirely your own.
            </p>
            <Link href="#residences" className="button light">
              Discover our residences <ArrowUpRight size={15} />
            </Link>
          </motion.div>
        </div>
        <a href="#residences" className="scroll-cue">
          SCROLL TO DISCOVER <ArrowDown size={16} />
        </a>
        <span className="hero-index">01 — A LIFE IN BALANCE</span>
      </section>
      <form
        className="search-strip"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters({ location, type, budget });
          document
            .querySelector("#residences")
            ?.scrollIntoView({ behavior: reduced ? "instant" : "smooth" });
        }}
      >
        <label>
          <span>YOUR PREFERRED LOCATION</span>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            {["All locations", "Bengaluru", "Mumbai", "Hyderabad"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          <span>A PLACE TO CALL HOME</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {["All residences", "Apartment", "Villa"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          <span>YOUR INVESTMENT</span>
          <select value={budget} onChange={(e) => setBudget(e.target.value)}>
            <option>Any budget</option>
            <option value="2">Up to ₹2 crore</option>
            <option value="4">Up to ₹4 crore</option>
            <option value="6">Up to ₹6 crore</option>
          </select>
        </label>
        <button className="button">
          Find your address <ArrowUpRight size={15} />
        </button>
      </form>
      <section className="section addresses" id="residences">
        <div className="section-heading" data-reveal>
          <div>
            <span className="eyebrow">A COLLECTION OF EXCEPTIONAL HOMES</span>
            <h2>
              Explore each
              <br />
              <em>address.</em>
            </h2>
          </div>
          <p>
            Different places. A shared philosophy.
            <br />
            Homes considered in every detail.
          </p>
          <span className="collection-count">
            {String(results.length).padStart(2, "0")} ADDRESSES
          </span>
        </div>
        <div className="property-grid">
          {results.map((p, i) => (
            <article className="property-card" key={p.slug}>
              <Link href={`/properties/${p.slug}`} className="property-photo">
                <Picture id={p.image} alt={`${p.name} illustrative exterior`} />
                <span className="property-number">
                  0{properties.indexOf(p) + 1}
                </span>
                <span className="property-badge">
                  {p.status === "Ready to move"
                    ? "READY TO MOVE"
                    : "NEW PERSPECTIVES"}
                </span>
              </Link>
              <div className="property-meta">
                <span>{p.location}</span>
                <span>{p.type}</span>
              </div>
              <Link href={`/properties/${p.slug}`} className="property-title">
                <h3>{p.name}</h3>
                <ArrowUpRight size={21} />
              </Link>
              <div className="property-last">
                <span>From ₹{p.price.toFixed(1)} Cr</span>
                <Link href={`/properties/${p.slug}`}>View residence</Link>
              </div>
            </article>
          ))}
        </div>
        {!results.length && (
          <div className="empty-results">
            <h3>A different possibility awaits.</h3>
            <p>No residences match these preferences. Try a wider search.</p>
            <button
              className="button"
              onClick={() => {
                setFilters({
                  location: "All locations",
                  type: "All residences",
                  budget: "Any budget",
                });
                setLocation("All locations");
                setType("All residences");
                setBudget("Any budget");
              }}
            >
              Reset search <ArrowRight size={16} />
            </button>
          </div>
        )}
      </section>
      <section className="editorial section" id="about">
        <div data-reveal>
          <span className="eyebrow">THE STILLWATER PHILOSOPHY</span>
          <h2>
            Designed around
            <br />
            <em>your daily rituals.</em>
          </h2>
        </div>
        <div className="editorial-copy" data-reveal>
          <p>
            Morning light through an open window. A walk beneath the trees. A
            familiar face in a shared courtyard.
          </p>
          <p>
            We believe the most remarkable homes are those that make ordinary
            moments feel extraordinary. Where architecture and nature meet, and
            life finds its own rhythm.
          </p>
          <a href="#amenities" className="text-link">
            Explore life at Stillwater <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="ritual-photo">
          <Picture
            id="interior1"
            alt="Sunlit living room with natural materials"
          />
        </div>
        <span className="vertical-caption">SPACES THAT LET LIFE UNFOLD</span>
      </section>
      <section className="featured" id="developments">
        <AnimatePresence initial={false}>
          <motion.div
            className="featured-photo"
            key={p.slug}
            initial={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, scale: 1.06, clipPath: "inset(0 100% 0 0)" }
            }
            animate={{ opacity: 1, scale: 1, clipPath: "inset(0 0% 0 0)" }}
            exit={{ opacity: 0 }}
            transition={{
              duration: reduced ? 0 : 1.3,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Picture id={p.image} alt={p.name} />
          </motion.div>
        </AnimatePresence>
        <div className="hero-shade" />
        <div className="featured-content">
          <span className="eyebrow">
            THE FEATURED ADDRESS / {p.location.toUpperCase()}
          </span>
          <AnimatePresence mode="wait">
            <motion.div
              key={p.slug}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
            >
              <h2>{p.name}</h2>
              <p>{p.description}</p>
              <Link href={`/properties/${p.slug}`} className="button light">
                Explore this address <ArrowUpRight size={16} />
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="featured-controls">
          <button
            aria-label="Previous featured property"
            onClick={() =>
              setFeatured(
                (featured - 1 + properties.length) % properties.length,
              )
            }
          >
            <ArrowLeft />
          </button>
          <span>0{featured + 1} / 05</span>
          <button
            aria-label="Next featured property"
            onClick={() => setFeatured((featured + 1) % properties.length)}
          >
            <ArrowRight />
          </button>
        </div>
      </section>
      <Amenities />
      <section className="section highlights">
        <div data-reveal>
          <span className="eyebrow">LESS ORDINARY. MORE YOU.</span>
          <h2>
            The beauty is
            <br />
            in the <em>balance.</em>
          </h2>
          <p>
            A home is more than its walls.
            <br />
            It’s everything they make possible.
          </p>
          <ul>
            {[
              "Architecture that welcomes natural light",
              "Landscapes that bring nature closer",
              "Thoughtful spaces for connection",
              "Craftsmanship you can feel",
            ].map((x, i) => (
              <li key={x}>
                <span>0{i + 1}</span>
                {x}
                <ArrowUpRight size={15} />
              </li>
            ))}
          </ul>
        </div>
        <div className="highlights-photo" data-reveal>
          <Picture
            id="courtyard"
            alt="Contemporary home surrounded by greenery"
          />
        </div>
      </section>
      <Gallery
        images={[
          "windsor",
          "interior2",
          "courtyard",
          "garden",
          "grand",
          "interior3",
        ]}
      />
      <Enquiry />
    </>
  );
}
