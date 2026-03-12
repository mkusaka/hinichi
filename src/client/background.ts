import {
  Scene,
  OrthographicCamera,
  PlaneGeometry,
  Mesh,
  ShaderMaterial,
  Vector2,
  Clock,
} from "three";
import { WebGPURenderer } from "three/webgpu";
import vertexShader from "./shaders/void.vert.glsl?raw";
import fragmentShader from "./shaders/void.frag.glsl?raw";

/**
 * Initializes a Three.js WebGPU (fallback: WebGL) full-screen shader background.
 * The shader creates a domain-warped FBM plasma nebula effect.
 */
export async function initBackground(canvas: HTMLCanvasElement): Promise<void> {
  const renderer = new WebGPURenderer({
    canvas,
    antialias: false,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  await renderer.init();

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uTime: { value: 0 },
    uResolution: {
      value: new Vector2(window.innerWidth, window.innerHeight),
    },
    uMouse: { value: 0.5 },
  };

  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    depthWrite: false,
    depthTest: false,
  });

  const plane = new Mesh(new PlaneGeometry(2, 2), material);
  scene.add(plane);

  const clock = new Clock();

  // Track mouse X for subtle shader influence
  document.addEventListener("mousemove", (event) => {
    uniforms.uMouse.value = event.clientX / window.innerWidth;
  });

  // Handle resize
  const handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    uniforms.uResolution.value.set(width, height);
  };
  window.addEventListener("resize", handleResize);

  // Render loop
  const animate = () => {
    uniforms.uTime.value = clock.getElapsedTime();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}
