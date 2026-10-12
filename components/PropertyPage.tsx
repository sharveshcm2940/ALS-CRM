"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, MapPin } from "lucide-react";
import { Property } from "@/lib/data";
import { Amenities, Enquiry, Gallery, Picture } from "./UI";
export function PropertyPage({ property: p }: { property: Property }) {
  const [plan, setPlan] = useState(0);
  const plans =
    p.type === "Villa"
      ? ["3 bedroom villa", "4 bedroom villa"]
      : ["2 bedroom residence", "3 bedroom residence"];
  return (
    <>
      <section className="hero property-hero">
        <div className="hero-picture" data-parallax>
          <Picture id={p.image} alt={`${p.name} exterior`} priority />
        </div>
        <div className="hero-shade" />
        <div className="hero-content">
          <span className="eyebrow">
            {p.status.toUpperCase()} / {p.type.toUpperCase()} RESIDENCES
          </span>
          <h1>{p.name}</h1>
          <div className="hero-bottom">
            <p>
              {p.location}
              <br />
              From ₹{p.price.toFixed(1)} crore
            </p>
            <a href="#contact" className="button light">
              Enquire about this address <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
        <a href="#overview" className="scroll-cue">
          EXPLORE THE ADDRESS <ArrowDown size={16} />
        </a>
      </section>
      <nav className="property-nav" aria-label="Property sections">
        {[
          "Overview",
          "Specifications",
          "Amenities",
          "Gallery",
          "Floor plans",
          "Location",
        ].map((x) => (
          <a key={x} href={`#${x.toLowerCase().replace(" ", "-")}`}>
            {x}
          </a>
        ))}
      </nav>
      <section className="section overview" id="overview">
        <div data-reveal>
          <span className="eyebrow">WELCOME TO {p.name.toUpperCase()}</span>
          <h2>
            A place to live.
            <br />
            <em>A life to love.</em>
          </h2>
        </div>
        <div data-reveal>
          <p className="large-copy">{p.description}</p>
          <p>
            Carefully planned spaces, tactile finishes and a landscape-led
            approach bring a quiet confidence to every residence.
          </p>
          <span className="development-note">
            Concept development: all project details, dates and prices are
            illustrative.
          </span>
        </div>
      </section>
      <section className="section specifications" id="specifications">
        <div className="spec-photo" data-reveal>
          <Picture id={p.gallery[1]} alt={`${p.name} interior concept`} />
        </div>
        <div data-reveal>
          <span className="eyebrow">CONSIDERED IN EVERY DETAIL</span>
          <h2>Specifications</h2>
          <dl>
            {[
              ["Total development area", p.area],
              ["Number of residences", String(p.homes)],
              [
                "Available configurations",
                p.type === "Villa"
                  ? "3 & 4 bedroom villas"
                  : "2 & 3 bedroom residences",
              ],
              [
                "Built-up area",
                p.type === "Villa" ? "2,800–4,200 sq ft" : "1,450–2,400 sq ft",
              ],
              ["Parking availability", "2 spaces per residence"],
              [
                "Project status",
                p.status === "Ready to move"
                  ? "Completed"
                  : "Under development",
              ],
              ["Possession", p.status],
            ].map(([a, b]) => (
              <div key={a}>
                <dt>{a}</dt>
                <dd>{b}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <Amenities />
      <section className="section highlights">
        <div data-reveal>
          <span className="eyebrow">ARCHITECTURAL HIGHLIGHTS</span>
          <h2>
            Space, light
            <br />
            and <em>possibility.</em>
          </h2>
          <p>{p.description}</p>
          <ul>
            {[
              "Generous terraces & considered views",
              "Naturally ventilated living spaces",
              "A landscape-led masterplan",
              ...p.amenities.slice(0, 2),
            ].map((x, i) => (
              <li key={x}>
                <span>0{i + 1}</span>
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="highlights-photo">
          <Picture id={p.image} alt="Architectural exterior details" />
        </div>
      </section>
      <Gallery images={p.gallery} />
      <section className="section floor-plans" id="floor-plans">
        <div>
          <span className="eyebrow">ROOM FOR YOUR LIFE</span>
          <h2>
            A thoughtful
            <br />
            <em>plan.</em>
          </h2>
          <p>Explore the way your home comes together.</p>
          <div
            className="plan-tabs"
            role="tablist"
            aria-label="Residence floor plans"
          >
            {plans.map((x, i) => (
              <button
                role="tab"
                aria-selected={plan === i}
                aria-controls="floorplan-panel"
                id={`plan-tab-${i}`}
                key={x}
                onClick={() => setPlan(i)}
              >
                {x}
              </button>
            ))}
          </div>
          <p className="large-copy">{plan === 0 ? "1,450" : "2,400"} sq ft</p>
          <span className="development-note">
            Illustrative layout. Not to scale or for construction.
          </span>
        </div>
        <div
          id="floorplan-panel"
          role="tabpanel"
          aria-labelledby={`plan-tab-${plan}`}
          className="plan-drawing"
        >
          <svg
            viewBox="0 0 600 480"
            role="img"
            aria-label={`${plans[plan]} illustrative floor plan`}
          >
            <rect
              x="60"
              y="45"
              width="480"
              height="370"
              fill="#f8f7f4"
              stroke="#514e46"
              strokeWidth="7"
            />
            <path
              d="M60 220H540 M260 45V220 M410 45V220 M350 220V415 M60 335H200 M200 220V415"
              stroke="#514e46"
              strokeWidth="5"
              fill="none"
            />
            <path
              d="M60 415V445H350V415"
              fill="none"
              stroke="#888478"
              strokeWidth="2"
            />
            <rect
              x="95"
              y="75"
              width="125"
              height="85"
              fill="#e2dfd6"
              stroke="#aaa496"
            />
            <rect
              x="285"
              y="75"
              width="90"
              height="85"
              fill="#e2dfd6"
              stroke="#aaa496"
            />
            <rect
              x="380"
              y="255"
              width="120"
              height="40"
              rx="3"
              fill="#e2dfd6"
            />
            <rect x="435" y="310" width="55" height="70" fill="#e2dfd6" />
            {[
              ["BEDROOM 01", 160, 185],
              ["BEDROOM 02", 335, 185],
              [plan ? "BEDROOM 03" : "STUDY", 475, 145],
              ["LIVING & DINING", 445, 340],
              ["KITCHEN", 125, 285],
              ["ENTRY", 265, 365],
              ["TERRACE", 200, 435],
            ].map(([text, x, y]) => (
              <text
                x={x}
                y={y}
                textAnchor="middle"
                key={String(text)}
                fill="#676259"
                fontSize="11"
                fontFamily="Arial"
              >
                {text}
              </text>
            ))}
            <path d="M565 70V40l-8 14m8-14 8 14" stroke="#514e46" fill="none" />
            <text x="565" y="88" textAnchor="middle" fontSize="11">
              N
            </text>
          </svg>
        </div>
      </section>
      <section className="section location-section" id="location">
        <div>
          <span className="eyebrow">CONNECTED, YET A WORLD APART</span>
          <h2>
            At home in
            <br />
            <em>{p.location.split(", ")[1]}.</em>
          </h2>
          <p>
            {p.location}. An address that brings you closer to the places and
            people that matter.
          </p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.location)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="button"
          >
            Explore the neighbourhood <MapPin size={15} />
          </a>
          <p className="development-note">
            Map shows the neighbourhood; no actual development address is
            represented.
          </p>
        </div>
        <div className="location-art">
          <span className="map-street s1" />
          <span className="map-street s2" />
          <span className="map-street s3" />
          <div className="map-label">
            <MapPin size={28} />
            <h3>{p.location.split(",")[0]}</h3>
            <span>{p.location.split(", ")[1]}</span>
          </div>
          <span className="map-caption">
            NEIGHBOURHOOD OVERVIEW / ILLUSTRATIVE
          </span>
        </div>
      </section>
      <Enquiry property={p.name} />
      <div className="section back-collection">
        <Link href="/#residences">← Explore all addresses</Link>
      </div>
    </>
  );
}
