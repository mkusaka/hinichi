import { initBackground } from "./background";
import { initAnimations } from "./animations";
import { initCursor } from "./cursor";
import { initNavigation } from "./navigation";

/**
 * Client entry point.
 * Initializes all visual effects and interactions for the hinichi HTML page.
 */
async function main() {
  // WebGPU/WebGL shader background (Three.js)
  const backgroundCanvas = document.getElementById(
    "voidBg",
  ) as HTMLCanvasElement | null;
  if (backgroundCanvas) {
    try {
      await initBackground(backgroundCanvas);
    } catch (error) {
      console.warn("Background shader failed to initialize:", error);
      // Canvas stays transparent — CSS background color shows through
    }
  }

  // GSAP scroll animations + parallax
  initAnimations();

  // Magnetic cursor glow
  initCursor();

  // Navigation controls
  initNavigation();

  // Copy button for AI summary
  const copyButton = document.querySelector<HTMLButtonElement>(".copy-btn");
  if (copyButton) {
    copyButton.addEventListener("click", () => {
      const text = copyButton.dataset.copyText ?? "";
      navigator.clipboard.writeText(text).then(() => {
        copyButton.textContent = "COPIED";
        copyButton.classList.add("copied");
        setTimeout(() => {
          copyButton.textContent = "COPY";
          copyButton.classList.remove("copied");
        }, 2000);
      });
    });
  }
}

main();
