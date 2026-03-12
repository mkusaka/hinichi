import { defineConfig } from "vite";
import { resolve } from "node:path";

/**
 * Vite config for client-side bundle.
 * Builds src/client/main.ts → public/client.js
 * The main Worker Vite config serves files from public/ automatically.
 */
export default defineConfig({
  publicDir: false,
  build: {
    outDir: "public",
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, "src/client/main.ts"),
      output: {
        entryFileNames: "client.js",
        chunkFileNames: "client-[name].js",
        assetFileNames: "client-[name].[ext]",
      },
    },
    sourcemap: true,
    minify: "esbuild",
  },
  assetsInclude: ["**/*.glsl"],
});
