import gsap from "gsap";

/**
 * Creates a smooth, magnetic cursor glow that follows the mouse
 * with GSAP easing. Only activates on hover-capable devices.
 */
export function initCursor(): void {
  const glowElement = document.getElementById("cursorGlow");
  if (!glowElement) return;

  // Only enable on devices with a pointer (desktop)
  if (!window.matchMedia("(hover: hover)").matches) return;

  let isVisible = false;

  document.addEventListener("mousemove", (event) => {
    gsap.to(glowElement, {
      left: event.clientX,
      top: event.clientY,
      duration: 0.5,
      ease: "power2.out",
    });

    if (!isVisible) {
      gsap.to(glowElement, { opacity: 0.4, duration: 0.3 });
      isVisible = true;
    }
  });

  document.addEventListener("mouseleave", () => {
    gsap.to(glowElement, { opacity: 0, duration: 0.4 });
    isVisible = false;
  });
}
