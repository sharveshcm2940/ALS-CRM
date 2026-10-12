"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Register after the route DOM commits, including newly filtered cards. */
export function MotionSystem() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>("main");
    if (!root) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const seen = new WeakSet<Element>();
      const seenImages = new WeakSet<Element>();
      const context = gsap.context(() => {}, root);
      const trigger = (element: Element) => ({
        trigger: element,
        start: "top 85%",
        once: true,
      });
      const register = () =>
        context.add(() => {
          root
            .querySelectorAll<HTMLElement>("[data-reveal]")
            .forEach((element) => {
              if (seen.has(element)) return;
              seen.add(element);
              gsap.fromTo(
                element,
                { y: 28, opacity: 0 },
                {
                  y: 0,
                  opacity: 1,
                  duration: 1.1,
                  ease: "power3.out",
                  scrollTrigger: trigger(element),
                },
              );
            });
          root
            .querySelectorAll<HTMLElement>(".section h2")
            .forEach((element) => {
              if (seen.has(element)) return;
              seen.add(element);
              gsap.fromTo(
                element,
                { y: 30, clipPath: "inset(0 0 100% 0)" },
                {
                  y: 0,
                  clipPath: "inset(0 0 0% 0)",
                  duration: 1.35,
                  ease: "power3.inOut",
                  scrollTrigger: trigger(element),
                },
              );
            });
          root
            .querySelectorAll<HTMLElement>(".property-card")
            .forEach((element, index) => {
              if (seen.has(element)) return;
              seen.add(element);
              gsap.fromTo(
                element,
                { y: 45, opacity: 0 },
                {
                  y: 0,
                  opacity: 1,
                  duration: 1.15,
                  delay: (index % 3) * 0.12,
                  ease: "power3.out",
                  scrollTrigger: trigger(element),
                },
              );
            });
          root
            .querySelectorAll<HTMLElement>(
              ".property-photo, .ritual-photo, .spec-photo, .highlights-photo, .amenity-stage, .gallery-tile",
            )
            .forEach((element, index) => {
              if (seenImages.has(element)) return;
              seenImages.add(element);
              const gallery = element.classList.contains("gallery-tile");
              const timeline = gsap.timeline({
                scrollTrigger: trigger(element),
                defaults: { ease: "power3.inOut" },
              });
              timeline.fromTo(
                element,
                { clipPath: "inset(0 0 100% 0)" },
                {
                  clipPath: "inset(0 0 0% 0)",
                  duration: 1.4,
                  delay: gallery ? (index % 3) * 0.09 : 0,
                },
              );
              const image = element.querySelector("img");
              if (image && !element.classList.contains("amenity-stage")) {
                timeline.fromTo(
                  image,
                  { scale: 1.12 },
                  { scale: 1, duration: 1.65, ease: "power2.out" },
                  0,
                );
              }
            });
          root
            .querySelectorAll<HTMLElement>(".specifications dl, .highlights ul")
            .forEach((element) => {
              if (seen.has(element)) return;
              seen.add(element);
              gsap.fromTo(
                Array.from(element.children),
                { opacity: 0, y: 20 },
                {
                  opacity: 1,
                  y: 0,
                  stagger: 0.1,
                  duration: 0.85,
                  ease: "power2.out",
                  scrollTrigger: trigger(element),
                },
              );
            });
          root
            .querySelectorAll<HTMLElement>("[data-parallax]")
            .forEach((element) => {
              if (seen.has(element)) return;
              seen.add(element);
              gsap.fromTo(
                element,
                { yPercent: -4 },
                {
                  yPercent: 5,
                  ease: "none",
                  scrollTrigger: {
                    trigger: element.parentElement,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 0.8,
                  },
                },
              );
            });
          root
            .querySelectorAll<HTMLElement>(".ritual-photo, .highlights-photo")
            .forEach((element) => {
              const image = element.querySelector("img");
              if (!image || image.dataset.parallaxRegistered) return;
              image.dataset.parallaxRegistered = "true";
              gsap.fromTo(
                image,
                { yPercent: -4 },
                {
                  yPercent: 4,
                  ease: "none",
                  scrollTrigger: {
                    trigger: element,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 0.8,
                  },
                },
              );
            });
        });
      register();
      const propertyHero = root.querySelector(".property-hero");
      if (propertyHero)
        context.add(() => {
          gsap.fromTo(
            propertyHero.querySelector(".hero-picture img"),
            { scale: 1.08 },
            { scale: 1, duration: 1.8, ease: "power2.out" },
          );
          gsap.fromTo(
            propertyHero.querySelectorAll(".hero-content > *"),
            { y: 40, opacity: 0, clipPath: "inset(0 0 100% 0)" },
            {
              y: 0,
              opacity: 1,
              clipPath: "inset(0 0 0% 0)",
              duration: 1.3,
              delay: 0.2,
              stagger: 0.16,
              ease: "power3.out",
            },
          );
        });
      let frame = 0;
      const refresh = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          register();
          ScrollTrigger.refresh();
        });
      };
      const observer = new MutationObserver(refresh);
      observer.observe(root, { childList: true, subtree: true });
      root.addEventListener("load", refresh, true);
      let alive = true;
      document.fonts.ready.then(() => {
        if (alive) refresh();
      });
      refresh();
      return () => {
        alive = false;
        cancelAnimationFrame(frame);
        observer.disconnect();
        root.removeEventListener("load", refresh, true);
        root
          .querySelectorAll("img[data-parallax-registered]")
          .forEach((image) =>
            image.removeAttribute("data-parallax-registered"),
          );
        context.revert();
      };
    });
    return () => media.revert();
  }, [pathname]);
  return null;
}
