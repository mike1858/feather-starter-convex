import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ routeFileIgnorePattern: "\\.test\\.tsx?$" }),
    viteReact(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "~": __dirname,
      "@": path.resolve(__dirname, "./src"),
      "@cvx": path.resolve(__dirname, "./convex"),
    },
  },
});
