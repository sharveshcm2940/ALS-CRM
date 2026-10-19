import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "baguette-washout-undying.ngrok-free.dev",
      ".ngrok-free.dev",
      ".ngrok-free.app",
      ".ngrok.io",
      "localhost",
      "127.0.0.1",
    ],
    proxy: { "/api": "http://127.0.0.1:4000" },
  },
});
