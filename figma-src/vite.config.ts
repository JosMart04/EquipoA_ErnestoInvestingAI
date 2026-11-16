import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Configuración compatible con Figma Make (puerto y host vienen del entorno cuando FIGMA está definido)
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  server: {
    port: process.env.FIGMA ? Number(process.env.PORT) : 5173,
    host: process.env.FIGMA ? (process.env.FIGMA_DEV_SERVER_HOST || "0.0.0.0") : undefined,
    strictPort: Boolean(process.env.FIGMA),
  },
});
