import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Sets up scroll-driven entrance animations for article entries
 * and parallax effect on the hero section.
 */
export function initAnimations(): void {
  // Entry entrance: slide in from alternating sides
  const entries = document.querySelectorAll<HTMLElement>(".entry");
  entries.forEach((entry, index) => {
    const fromX = index % 2 === 0 ? -60 : 60;
    gsap.from(entry, {
      scrollTrigger: {
        trigger: entry,
        start: "top 88%",
        once: true,
      },
      opacity: 0,
      x: fromX,
      duration: 0.7,
      ease: "power3.out",
      delay: (index % 4) * 0.08, // stagger within viewport batch
    });
  });

  // Hero parallax: background image shifts on scroll
  const hero = document.querySelector<HTMLElement>(".hero");
  if (hero) {
    gsap.to(hero, {
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
      backgroundPositionY: "60%",
      ease: "none",
    });
  }

  // Scroll progress bar
  const progressBar = document.querySelector<HTMLElement>(".progress-bar");
  if (progressBar) {
    gsap.to(progressBar, {
      scrollTrigger: {
        trigger: document.documentElement,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.3,
      },
      width: "100%",
      ease: "none",
    });
  }
}
