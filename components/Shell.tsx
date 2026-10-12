"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
gsap.registerPlugin(ScrollTrigger);
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const menuButton = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    setOpen(false);
    const change = () => setScrolled(window.scrollY > 50);
    change();
    window.addEventListener("scroll", change, { passive: true });
    return () => window.removeEventListener("scroll", change);
  }, [path]);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ duration: 1.05, anchors: true });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) =>
        gsap.fromTo(
          el,
          { y: 35, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 94%", once: true },
          },
        ),
      );
      gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) =>
        gsap.fromTo(
          el,
          { yPercent: -3 },
          {
            yPercent: 3,
            ease: "none",
            scrollTrigger: {
              trigger: el.parentElement,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          },
        ),
      );
    });
    return () => ctx.revert();
  }, [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const items = Array.from(
      document.querySelectorAll<HTMLElement>(".mobile-menu a"),
    );
    items[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
      if (event.key === "Tab") {
        const focusable = [menuButton.current, ...items].filter(
          Boolean,
        ) as HTMLElement[];
        const index = focusable.indexOf(document.activeElement as HTMLElement);
        const next =
          (index + (event.shiftKey ? -1 : 1) + focusable.length) %
          focusable.length;
        event.preventDefault();
        focusable[next]?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);
  const links = [
    ["Home", "/"],
    ["Residences", "/#residences"],
    ["Developments", "/#developments"],
    ["Amenities", "/#amenities"],
    ["About", "/#about"],
    ["Contact", "/#contact"],
  ];
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className={`nav ${scrolled || open ? "solid" : ""}`}>
        <Link href="/" className="wordmark">
          stillwater<span>RESIDENCES</span>
        </Link>
        <nav aria-label="Main navigation" className="desktop-nav">
          {links.map(([name, href]) => (
            <Link key={name} href={href}>
              {name}
            </Link>
          ))}
        </nav>
        <Link className="button nav-cta" href="/#contact">
          Enquire now <ArrowUpRight size={13} />
        </Link>
        <button
          aria-label={open ? "Close menu" : "Open menu"}
          ref={menuButton}
          aria-controls="mobile-navigation"
          aria-expanded={open}
          className="menu-button"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            id="mobile-navigation"
            className="mobile-menu"
            aria-label="Mobile navigation"
          >
            {links.map(([name, href], i) => (
              <Link onClick={() => setOpen(false)} href={href} key={name}>
                <span>0{i + 1}</span>
                {name}
                <ArrowUpRight />
              </Link>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
      <motion.main
        id="main"
        key={path}
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        {children}
      </motion.main>
      <footer>
        <div className="footer-top">
          <Link href="/" className="wordmark">
            stillwater<span>RESIDENCES</span>
          </Link>
          <p>
            Architecture. Landscape. Life.
            <br />
            Beautifully in balance.
          </p>
          <a href="/#contact">
            Let’s start a conversation <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} Stillwater. A demonstration project.
          </span>
          <span>
            Illustrative residences & photography. Prices are indicative.
          </span>
          <a href="/images/CREDITS.txt">Image credits</a>
        </div>
      </footer>
    </>
  );
}
