import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// New imports needed for ESM compatibility
import { fileURLToPath } from 'url';

// --- Universal rootDir Logic ---
let rootDir: string;

if (typeof __dirname !== 'undefined') {
  // 1. CJS Environment (Production build using esbuild)
  rootDir = __dirname;
} else {
  // 2. ESM Environment (Development using tsx/nodemon)
  const __filename = fileURLToPath(import.meta.url);
  rootDir = path.dirname(__filename);
}

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "client", "src"),
      "@shared": path.resolve(rootDir, "shared"),
      "@assets": path.resolve(rootDir, "attached_assets"),
    },
  },
  root: path.resolve(rootDir, "client"),
  build: {
    outDir: path.resolve(rootDir, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
