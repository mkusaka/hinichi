import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Sets up scroll-driven animations for the editorial magazine layout.
 * Uses CSS scroll-driven animations where supported (Chrome 115+, Safari 26+),
 * falls back to GSAP ScrollTrigger otherwise.
 */
export function initAnimations(): void {
  const supportsScrollDriven = CSS.supports("animation-timeline", "view()");

  // Card reveal animations (GSAP fallback when CSS scroll-driven not available)
  if (!supportsScrollDriven) {
    const cards = document.querySelectorAll<HTMLElement>(".card");
    cards.forEach((card, index) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: "top 90%",
          once: true,
        },
        opacity: 0,
        y: 60,
        filter: "blur(4px)",
        duration: 0.8,
        ease: "power3.out",
        delay: (index % 3) * 0.1,
      });
    });
  }

  // Splash image parallax (always GSAP — CSS can't easily do this)
  const splash = document.querySelector<HTMLElement>(".splash");
  if (splash) {
    const splashImage = splash.querySelector<HTMLElement>(".splash-img");
    if (splashImage) {
      gsap.to(splashImage, {
        scrollTrigger: {
          trigger: splash,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
        y: "20%",
        scale: 1.1,
        ease: "none",
      });
    }
  }

  // Vertical scroll progress line (always GSAP)
  const scrollLine = document.querySelector<HTMLElement>(".scroll-line");
  if (scrollLine) {
    gsap.to(scrollLine, {
      scrollTrigger: {
        trigger: document.documentElement,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.3,
      },
      height: "100vh",
      ease: "none",
    });
  }
}
