"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Keyboard, A11y } from "swiper/modules";
import "swiper/css";
import { amenityImages, photo } from "@/lib/data";
export function Picture({
  id,
  alt,
  className = "",
  priority = false,
}: {
  id: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={photo(id)}
      alt={alt}
      fill
      sizes="(max-width: 760px) 100vw, 70vw"
      priority={priority}
      className={className}
    />
  );
}
export function Amenities() {
  const [active, setActive] = useState(0);
  return (
    <section className="section amenities" id="amenities">
      <div className="section-heading" data-reveal>
        <div>
          <span className="eyebrow">THE ART OF EVERYDAY</span>
          <h2>
            Clubhouse &<br />
            <em>amenities.</em>
          </h2>
        </div>
        <p>
          Room to reconnect. Space to switch off.
          <br />A little more life, in every day.
        </p>
      </div>
      <div className="amenity-stage">
        <AnimatePresence mode="wait">
          <motion.div
            className="amenity-photo"
            key={active}
            initial={{ opacity: 0.5, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <Picture
              id={amenityImages[active].id}
              alt={amenityImages[active].name}
            />
            <div className="amenity-caption">
              <span>0{active + 1} / 07</span>
              <h3>{amenityImages[active].name}</h3>
              <p>{amenityImages[active].text}</p>
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="amenity-select">
          <Swiper
            modules={[Keyboard, A11y]}
            keyboard={{ enabled: true }}
            spaceBetween={12}
            slidesPerView={2.2}
            breakpoints={{
              760: { slidesPerView: 3.2 },
              1100: { slidesPerView: 4.5 },
            }}
          >
            {amenityImages.map((a, i) => (
              <SwiperSlide key={a.id}>
                <button
                  aria-label={a.name}
                  aria-pressed={active === i}
                  onClick={() => setActive(i)}
                  className={`amenity-thumb ${active === i ? "active" : ""}`}
                >
                  <div>
                    <Picture id={a.id} alt={a.name} />
                  </div>
                  <span>{a.name}</span>
                </button>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
}
export function Gallery({
  images,
  title = "A closer look.",
}: {
  images: string[];
  title?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  function close() {
    ref.current?.close();
    setActive(null);
    trigger.current?.focus();
  }
  useEffect(() => {
    if (active === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight")
        setActive((i) => (i === null ? 0 : (i + 1) % images.length));
      if (e.key === "ArrowLeft")
        setActive((i) =>
          i === null ? 0 : (i - 1 + images.length) % images.length,
        );
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [active, images.length]);
  return (
    <section className="section" id="gallery">
      <div className="section-heading" data-reveal>
        <div>
          <span className="eyebrow">IN THE DETAILS</span>
          <h2>{title}</h2>
        </div>
        <p>
          A collection of spaces,
          <br />
          made for living.
        </p>
      </div>
      <div className="masonry">
        {images.map((id, i) => (
          <button
            key={`${id}${i}`}
            onClick={(e) => {
              trigger.current = e.currentTarget;
              setActive(i);
              ref.current?.showModal();
            }}
            className="gallery-tile"
            aria-label={`Open photograph ${i + 1}`}
          >
            <Picture
              id={id}
              alt={`Architectural gallery: ${id.replace(/\d/g, "")}`}
            />
            <span>
              View photograph <ArrowUpRight size={16} />
            </span>
          </button>
        ))}
      </div>
      <dialog
        ref={ref}
        className="lightbox"
        aria-label="Photograph viewer"
        onCancel={() => {
          setActive(null);
          trigger.current?.focus();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <button
          className="lightbox-close"
          onClick={close}
          aria-label="Close gallery"
        >
          <X />
        </button>
        {active !== null && (
          <>
            <div className="lightbox-image">
              <Picture id={images[active]} alt={`Photograph ${active + 1}`} />
            </div>
            <div className="lightbox-controls">
              <button
                aria-label="Previous photograph"
                onClick={() =>
                  setActive((active - 1 + images.length) % images.length)
                }
              >
                <ArrowLeft />
              </button>
              <span>
                {active + 1} / {images.length}
              </span>
              <button
                aria-label="Next photograph"
                onClick={() => setActive((active + 1) % images.length)}
              >
                <ArrowRight />
              </button>
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}
export function Enquiry({
  property = "General enquiry",
}: {
  property?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setState("loading");
    setMessage("");
    try {
      const body = Object.fromEntries(new FormData(form));
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, property }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(result.message);
      setState("done");
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
      setState("error");
    }
  }
  return (
    <section className="section enquiry" id="contact">
      <div data-reveal>
        <span className="eyebrow">YOUR NEXT CHAPTER</span>
        <h2>
          Every home starts
          <br />
          with a <em>conversation.</em>
        </h2>
        <p>
          Tell us what you’re looking for.
          <br />
          We’ll help you explore the possibilities.
        </p>
        <span className="development-note">
          Demonstration form — enquiries are validated, but not sent or stored.
        </span>
      </div>
      <form onSubmit={submit}>
        <div className="form-row">
          <label>
            Your name
            <input
              required
              name="name"
              autoComplete="name"
              minLength={2}
              maxLength={100}
              placeholder="Full name"
            />
          </label>
          <label>
            Email address
            <input
              type="email"
              required
              name="email"
              autoComplete="email"
              maxLength={254}
              placeholder="you@example.com"
            />
          </label>
        </div>
        <label>
          Phone number <span>(optional)</span>
          <input
            type="tel"
            name="phone"
            autoComplete="tel"
            maxLength={30}
            placeholder="Your contact number"
          />
        </label>
        <label>
          A little about your plans
          <textarea
            name="message"
            maxLength={3000}
            rows={3}
            placeholder="Your preferred address, or anything you’d like to know."
          />
        </label>
        <label className="consent">
          <input type="checkbox" required />I understand this is a demonstration
          and my enquiry will not be delivered.
        </label>
        <button className="button" disabled={state === "loading"}>
          {state === "loading" ? "Validating…" : "Submit enquiry"}{" "}
          <ArrowUpRight size={16} />
        </button>
        <p
          role={state === "error" ? "alert" : "status"}
          className={`form-status ${state}`}
        >
          {message}
        </p>
      </form>
    </section>
  );
}
